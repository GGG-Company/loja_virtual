# Feira das Ferramentas

E-commerce full-stack de ferramentas, construído com Next.js 16, PostgreSQL e integrações nativas com Mercado Pago e Melhor Envio.

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, Tailwind CSS, shadcn/ui, Framer Motion |
| Banco de Dados | PostgreSQL + Prisma ORM |
| Autenticação | NextAuth v5 (Credentials + Google OAuth) |
| Pagamentos | Mercado Pago (Cartão, PIX, Boleto) |
| Frete | Melhor Envio (OAuth 2.0) |
| Cache / Rate limiting | Redis (opcional) |
| IA | OpenAI GPT-4o-mini (assistente opcional) |

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (opcional — tem fallback in-memory)
- Conta Mercado Pago sandbox (para pagamentos)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com as suas credenciais. Variáveis obrigatórias:

```env
# Banco de dados
DATABASE_URL="postgresql://user:pass@localhost:5432/shopping"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."           # openssl rand -base64 32

# Mercado Pago (sandbox)
MERCADO_PAGO_PUBLIC_KEY="TEST-..."
MERCADO_PAGO_ACCESS_TOKEN="TEST-..."
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY="TEST-..."
MERCADO_PAGO_SANDBOX="true"

# Melhor Envio
MELHOR_ENVIO_CLIENT_ID="..."
MELHOR_ENVIO_CLIENT_SECRET="..."
MELHOR_ENVIO_CALLBACK="http://localhost:3000/api/integrations/melhor-envio/callback"
SHIPPING_ORIGIN_ZIP="01310100"
MELHOR_ENVIO_SANDBOX="true"

# API key interna
X_INTERNAL_API_KEY="..."        # openssl rand -hex 32

# Redis (opcional)
REDIS_URL="redis://localhost:6379"
```

### 3. Criar e popular banco de dados

```bash
npm run db:generate     # Gera o Prisma Client
npm run db:migrate      # Aplica as migrations
npm run db:seed         # Popula com dados de exemplo (produtos, categorias, admin)
```

Credenciais do admin após seed:
- Email: `admin@shopping.com`
- Senha: `Admin@123`

### 4. Iniciar servidor de desenvolvimento

```bash
npm run dev             # Next.js em http://localhost:3000
npm run dev:clean       # Limpa cache .next antes de iniciar (necessário após mudar NEXT_PUBLIC_*)
```

---

## Scripts disponíveis

```bash
# Desenvolvimento
npm run dev             # Inicia Next.js com hot reload
npm run dev:clean       # Limpa .next e inicia
npm run build           # Build de produção
npm run start           # Inicia servidor de produção

# Banco de dados (Prisma)
npm run db:generate     # Regenera o Prisma Client
npm run db:push         # Aplica schema sem migration (uso em dev)
npm run db:migrate      # Cria e aplica migrations
npm run db:studio       # Abre Prisma Studio (GUI do banco)
npm run db:seed         # Seed com dados de exemplo
npm run db:kill-idle    # Mata conexões idle no PostgreSQL

# Qualidade
npm run lint            # ESLint
```

---

## Deploy em produção

### Docker (recomendado)

O projeto usa `output: 'standalone'` no `next.config.mjs`, gerando uma imagem Docker otimizada.

```bash
# Build da imagem
docker build -t shopping-ferramentas .

# Subir com docker-compose
docker compose up -d
```

### Variáveis obrigatórias em produção

```env
NEXTAUTH_URL="https://seu-dominio.com.br"
NEXTAUTH_SECRET="<32 bytes aleatorios>"
MERCADO_PAGO_SANDBOX="false"
MELHOR_ENVIO_SANDBOX="false"
NODE_ENV="production"
```

### Nginx

Apenas as portas 80 e 443 são gerenciadas pelo nginx do sistema.

---

## Estrutura rápida

```
src/
  app/           # Páginas (App Router) e API Routes
  components/    # Componentes React reutilizáveis
  lib/           # Clientes e utilitários (prisma, redis, mercadopago...)
  hooks/         # Custom React hooks
prisma/
  schema.prisma  # Modelos do banco de dados
  migrations/    # Histórico de migrations
redis/           # docker-compose do Redis
docs/            # Documentação técnica detalhada
```

Documentação técnica detalhada: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/BACKEND.md`](docs/BACKEND.md) · [`docs/FRONTEND.md`](docs/FRONTEND.md)
