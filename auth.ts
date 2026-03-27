import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@prisma/client';
import type { Adapter } from 'next-auth/adapters';

/** Proteção contra brute force — bloqueia após MAX_ATTEMPTS tentativas por WINDOW_MS */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

function checkLoginAttempt(email: string): { blocked: boolean; retryAfterSec?: number } {
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);
  const now = Date.now();

  if (entry && now < entry.blockedUntil) {
    return { blocked: true, retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  if (entry && now >= entry.blockedUntil) {
    loginAttempts.delete(key);
  }

  return { blocked: false };
}

function recordFailedAttempt(email: string) {
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key) || { count: 0, blockedUntil: 0 };
  entry.count++;

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOGIN_WINDOW_MS;
  }

  loginAttempts.set(key, entry);
}

function clearAttempts(email: string) {
  loginAttempts.delete(email.toLowerCase());
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
        const { blocked, retryAfterSec } = checkLoginAttempt(email);
        if (blocked) {
          throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${retryAfterSec} segundos.`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          recordFailedAttempt(email);
          throw new Error('Credenciais inválidas');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          recordFailedAttempt(email);
          throw new Error('Credenciais inválidas');
        }

        // Login bem-sucedido — limpar tentativas
        clearAttempts(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          cpf: user.cpf,
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
      }

      // Update manual (ex: mudar nome)
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.image = session.image;
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
