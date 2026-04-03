import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getRedisPublisher } from '@/lib/redis';
import type { UserRole } from '@prisma/client';
import type { Adapter } from 'next-auth/adapters';

/** Proteção contra brute force — bloqueia após MAX_ATTEMPTS tentativas por WINDOW_MS */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SEC = 15 * 60; // 15 minutos

/** Tenta usar Redis; cai de volta para Map in-memory se Redis não estiver disponível */
const loginAttemptsFallback = new Map<string, { count: number; blockedUntil: number }>();

async function checkLoginAttempt(email: string): Promise<{ blocked: boolean; retryAfterSec?: number }> {
  const key = `login:attempts:${email.toLowerCase()}`;
  const redis = getRedisPublisher();

  if (redis) {
    try {
      const data = await redis.get(key);
      if (!data) return { blocked: false };
      const entry = JSON.parse(data) as { count: number; blockedUntil: number };
      const now = Date.now();
      if (entry.blockedUntil && now < entry.blockedUntil) {
        return { blocked: true, retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000) };
      }
      return { blocked: false };
    } catch {
      // Redis falhou — cair no fallback abaixo
    }
  }

  // Fallback in-memory
  const entry = loginAttemptsFallback.get(key);
  const now = Date.now();
  if (entry && now < entry.blockedUntil) {
    return { blocked: true, retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  if (entry && now >= entry.blockedUntil) loginAttemptsFallback.delete(key);
  return { blocked: false };
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = `login:attempts:${email.toLowerCase()}`;
  const redis = getRedisPublisher();

  if (redis) {
    try {
      const data = await redis.get(key);
      const entry = data ? JSON.parse(data) : { count: 0, blockedUntil: 0 };
      entry.count++;
      if (entry.count >= LOGIN_MAX_ATTEMPTS) {
        entry.blockedUntil = Date.now() + LOGIN_WINDOW_SEC * 1000;
      }
      await redis.set(key, JSON.stringify(entry), 'EX', LOGIN_WINDOW_SEC);
      return;
    } catch {
      // cair no fallback
    }
  }

  const entry = loginAttemptsFallback.get(key) || { count: 0, blockedUntil: 0 };
  entry.count++;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOGIN_WINDOW_SEC * 1000;
  }
  loginAttemptsFallback.set(key, entry);
}

async function clearAttempts(email: string): Promise<void> {
  const key = `login:attempts:${email.toLowerCase()}`;
  const redis = getRedisPublisher();
  if (redis) {
    try { await redis.del(key); return; } catch { /* fallthrough */ }
  }
  loginAttemptsFallback.delete(key);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Cast para alinhar tipos de Adapter entre @auth/core e next-auth
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        const email = credentials.email as string;

        // Verificar bloqueio por tentativas excessivas
        const { blocked, retryAfterSec } = await checkLoginAttempt(email);
        if (blocked) {
          throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${retryAfterSec} segundos.`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          await recordFailedAttempt(email);
          throw new Error('Credenciais inválidas');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          await recordFailedAttempt(email);
          throw new Error('Credenciais inválidas');
        }

        // Login bem-sucedido — limpar tentativas
        await clearAttempts(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          cpf: user.cpf,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Primeira autenticação
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'CUSTOMER';
        token.cpf = (user as any).cpf || null;
        token.tokenVersion = (user as any).tokenVersion ?? 0;
      }

      // Update manual (ex: mudar nome ou forçar revogação)
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.image = session.image;
      }

      // Verificar se o token foi revogado (tokenVersion no DB divergiu)
      // Faz a checagem no DB apenas em renovações (sem user no payload)
      if (!user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true, deletedAt: true },
        });
        // Conta excluída ou tokenVersion incrementado pelo admin/logout forçado
        if (!dbUser || dbUser.deletedAt || dbUser.tokenVersion !== token.tokenVersion) {
          return null; // invalida o JWT
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.cpf = token.cpf as string | null;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Google OAuth: definir role padrão
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Primeiro usuário Google vira CUSTOMER
          await prisma.user.update({
            where: { email: user.email! },
            data: { role: 'CUSTOMER' },
          });
        }
      }
      return true;
    },
  },
  trustHost: true,
});
