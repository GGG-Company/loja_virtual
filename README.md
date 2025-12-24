# 🛒 Shopping das Ferramentas - Hub Omni-channel

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.15-2D3748?logo=prisma)](https://prisma.io)
[![NextAuth](https://img.shields.io/badge/NextAuth-v5-orange)](https://next-auth.js.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com)

Plataforma e-commerce proprietária construída com **Next.js 14+**, **TypeScript**, **Prisma ORM** e **NextAuth v5**. Sistema completo de loja virtual profissional com RBAC (Role-Based Access Control), painel administrativo moderno, integração com Mercado Livre e Hiper, e APIs seguras para workers externos.

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Funcionalidades Completas](#-funcionalidades-completas)
- [Stack Tecnológica](#-stack-tecnológica)
- [Páginas do Sistema](#-páginas-do-sistema)
- [Instalação e Setup](#-instalação-e-setup)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Segurança e RBAC](#-segurança-e-rbac)
- [Guias Detalhados](#-guias-detalhados)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Checklist Completo](#-checklist-completo)

---

## 🎯 Visão Geral

A empresa **Shopping das Ferramentas** opera em **3 frentes**:
1. **Loja Física** (Feira de Santana, BA)
2. **Mercado Livre** (vendas online)
3. **Loja Virtual** (este projeto) - **Vitrine Oficial + Hub Centralizador**

### Objetivo do Projeto

Criar um **E-commerce Completo** que:
- ✅ Vitrine profissional de produtos (Homepage, Listagem, Detalhes)
- ✅ Sistema de autenticação robusto (Google OAuth + Email/Senha)
- ✅ Área do usuário (Perfil, Pedidos, Endereços)
- ✅ **Pagamento simulado** com PIX QR Code, Boleto e Cartão
- ✅ **Auto-cancelamento** de pedidos após 15 minutos
- ✅ Painel administrativo moderno com RBAC
- ✅ Dashboard com estatísticas em tempo real
- ✅ **Sistema de Picking** com localização de estoque
- ✅ **Painel de Pedidos Enviados** com rastreamento
- ✅ **Webhooks n8n** para notificações de status
- ✅ **Interface 100% PT-BR** com labels localizados
- ✅ APIs de integração protegidas
- ✅ Módulo financeiro exclusivo para OWNER
- ✅ Animações Framer Motion em todas as páginas
- ✅ Design responsivo e moderno
- ✅ 15+ páginas completas (Públicas, Admin, Institucionais)

### Regra de Ouro

> **A aplicação Next.js é um "cérebro passivo". Ela não executa automações (disparos de Zap), mas expõe APIs seguras para workers externos consumirem.**

---

## 🚀 Funcionalidades Completas

### 🛍️ **Storefront (Loja Virtual)**

#### **Homepage**
- Hero Section com gradiente e CTAs destacados
- Grid de Categorias (Ferramentas Elétricas, Manuais, Jardinagem, EPIs)
- Produtos em Destaque (marcados como `is_featured`)
- Header com busca e carrinho
- Footer completo com links e redes sociais

#### **Página de Produtos (PLP)**
- Listagem com grid responsivo (4→3→2→1 colunas)
- Filtros avançados:
  - Faixa de preço (slider R$ 0-5.000)
  - Marcas (Makita, Bosch, DeWalt...)
  - Voltagem (110V, 220V, Bivolt, Bateria)
- Ordenação (Mais Recentes, Menor/Maior Preço, A-Z)
- Skeleton loading states
- Animações Framer Motion

#### **Página de Detalhe do Produto (PDP)**
- Galeria de imagens (aspect-square)
- Buy Box completo:
  - Preço com desconto
  - Parcelamento calculado dinamicamente
  - Seletor de voltagem (variants)
  - Seletor de quantidade
  - Botão "Adicionar ao Carrinho"
- Especificações técnicas (tabela JSONB)
- Badges de benefícios (Frete, Garantia, Parcelamento)

### 🔐 **Autenticação**

#### **Login** (`/auth/login`)
- OAuth Google (one-click)
- Login com Email/Senha (bcrypt)
- Link "Esqueceu sua senha?"
- **Credenciais de teste visíveis:**
  ```
  Owner: dono@loja.com / senha123
  Admin: gerente@loja.com / senha123
  Cliente: cliente@gmail.com / senha123
  ```

#### **Registro** (`/auth/register`)
- Form completo (Nome, Email, Telefone, Senha)
- Validações com Zod
- Novos usuários começam como `CUSTOMER`

### 👤 **Área do Usuário** (`/minha-conta`)

**Tabs:**
1. **Meu Perfil**: Editar dados pessoais
2. **Meus Pedidos**: Histórico de compras com status
3. **Endereços**: Gerenciar endereços de entrega

**Proteção:** Redireciona para login se não autenticado

### 🛡️ **Painel Administrativo** (`/admin`)

#### **Layout Moderno**
- Sidebar fixa com gradiente escuro
- Menu responsivo (hamburger no mobile)
- User info card com badge de role
- Navegação:
  - Dashboard 📊
  - Produtos 📦
  - Pedidos 🛒
  - Separação 📋
  - Financeiro 💰 (OWNER only)
  - Configurações ⚙️

#### **Dashboard** (`/admin/dashboard`)
- 4 Stats Cards animados:
  - Produtos Cadastrados
  - Pedidos Total
  - Pedidos Pendentes
  - Faturamento
- Pedidos Recentes (últimos 5)
- Alerta de Estoque Baixo (`<= 10 unidades`)
- Atualização em tempo real

#### **Gestão de Produtos** (`/admin/products`)
- CRUD completo
- Tabela com paginação
- Filtros por categoria
- Modal de criação/edição
- Upload de imagens

#### **Pedidos** (`/admin/orders`)
- Listagem com filtros por status
- Atualização de status
- View detalhes do pedido

#### **Separação (Picking)** (`/admin/picking`)
- Lista otimizada por `stock_location`
- Agrupa itens de pedidos pendentes
- Ordem alfabética para rota eficiente

#### **Financeiro (OWNER Only)** (`/admin/financial`)
- Configuração de juros mensal
- Máximo de parcelas
- Parcela mínima
- Relatórios de faturamento

**Proteção RBAC:**
```typescript
Middleware bloqueia CUSTOMER de acessar /admin/*
Middleware bloqueia ADMIN de acessar /admin/financial/*
Apenas OWNER acessa /admin/financial/*
```

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTES (Usuários)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │
│  │Customer │  │ Admin   │  │ Owner   │  │  Google     │   │
│  │  (User) │  │(Gerente)│  │ (Dono)  │  │  OAuth      │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘   │
└───────┼───────────┼────────────┼──────────────┼────────────┘
        │           │            │              │
        ▼           ▼            ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS 14 APP (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Loja Virtual│  │ Painel Admin │  │ Painel OWNER │      │
│  │  (Public)    │  │  (Protected) │  │ (Financial)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                  │                  │            │
│           └──────────────────┴──────────────────┘            │
│                           │                                  │
│                           ▼                                  │
│              ┌─────────────────────────┐                     │
│              │   NEXTAUTH V5 (Auth)    │                     │
│              │  JWT + HttpOnly Cookies │                     │
│              └─────────────────────────┘                     │
│                           │                                  │
│                           ▼                                  │
│              ┌─────────────────────────┐                     │
│              │  MIDDLEWARE (RBAC)      │                     │
│              │  - /admin → ADMIN/OWNER │                     │
│              │  - /admin/financial → OWNER ONLY             │
│              └─────────────────────────┘                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  API ROUTES (Backend)                        │
│  ┌──────────────────┐  ┌───────────────────────────┐        │
│  │ /api/integrations│  │ /api/admin (CRUD)         │        │
│  │ (X-API-KEY)      │  │ (Session Auth)            │        │
│  │                  │  │                           │        │
│  │ • stock/sync     │  │ • Products                │        │
│  │ • orders/update  │  │ • Orders                  │        │
│  │ • marketing/     │  │ • Financial Config        │        │
│  │   abandoned-carts│  │                           │        │
│  └──────────────────┘  └───────────────────────────┘        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              PRISMA ORM + POSTGRESQL                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Users   │ │ Products │ │  Orders  │ │  Logs    │       │
│  │ (RBAC)   │ │ Variants │ │  Coupons │ │ StockLog │       │
│  │          │ │ Categories│ │  Cart    │ │ IntegLog │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                      ▲
                      │
┌─────────────────────┴───────────────────────────────────────┐
│              WORKERS EXTERNOS (Automações)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Zapier     │  │     n8n      │  │  Bot WhatsApp│      │
│  │ (ML Sync)    │  │ (Hiper Sync) │  │ (Abandoned)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## � Páginas do Sistema

### **Páginas Públicas (Storefront)**

| Rota | Descrição | Componentes Principais |
|------|-----------|------------------------|
| `/` | Homepage com hero, categorias e destaques | `HeroSection`, `CategoriesGrid`, `FeaturedProducts` |
| `/produtos` | Listagem de produtos com filtros avançados | `ProductCard`, `Slider`, filtros de preço/marca/voltagem |
| `/produtos/[id]` | Detalhe do produto com buy box completo | Galeria, seletor de voltagem, specs técnicas |
| `/auth/login` | Login com Google OAuth e credenciais | Form validado, credenciais de teste visíveis |
| `/auth/register` | Registro de novos usuários | Validação Zod, hash bcrypt |

### **Área do Usuário (Autenticada)**

| Rota | Descrição | Proteção |
|------|-----------|----------|
| `/minha-conta` | Dashboard do usuário com tabs | Redirect se não autenticado |
| `/minha-conta?tab=perfil` | Editar dados pessoais | Session required |
| `/minha-conta?tab=pedidos` | Histórico de pedidos com status PT-BR | Session required |
| `/minha-conta?tab=enderecos` | Gerenciar endereços | Session required |
| `/pagamento/[id]` | Página de pagamento com QR PIX e timer | Session required |
| `/checkout/pagamento` | Pagamento alternativo via query params | Session required |

### **Painel Administrativo (RBAC)**

| Rota | Descrição | Role Necessário |
|------|-----------|-----------------|
| `/admin/dashboard` | Dashboard com stats e gráficos | ADMIN, OWNER |
| `/admin/products` | CRUD de produtos | ADMIN, OWNER |
| `/admin/orders` | Gestão de pedidos com status PT-BR | ADMIN, OWNER |
| `/admin/picking` | **Separação**: itens, localização, cliente | ADMIN, OWNER |
| `/admin/orders/enviados` | **Enviados**: SHIPPED/DELIVERED com tracking | ADMIN, OWNER |
| `/admin/financial` | Configuração de juros e relatórios | **OWNER ONLY** |
| `/admin/settings` | Configurações gerais | ADMIN, OWNER |

### **APIs (Backend)**

#### **APIs Públicas**
```
GET /api/products                # Listar produtos
GET /api/products/[id]           # Detalhe do produto
GET /api/financial/config        # Config pública (juros, parcelas)
POST /api/shipping/quote         # Cálculo de frete (CEP + peso/dimensões)
POST /api/assistant              # Chat RAG seguro (somente dados públicos)
```

#### **APIs Autenticadas (Session)**
```
POST /api/auth/register                        # Criar conta
GET  /api/user/orders                          # Pedidos (auto-cancela expirados)
GET  /api/user/orders/[id]                     # Detalhe do pedido
POST /api/user/orders/[id]/confirm-delivery    # Confirmar entrega (→ webhook)
POST /api/orders/[id]/payment                  # Processar pagamento (→ webhook)
POST /api/orders/quote                         # Criar orçamento (status QUOTE) + PDF
GET  /api/admin/stats                          # Estatísticas do dashboard
GET  /api/admin/products                       # Listar produtos (ADMIN/OWNER)
POST /api/admin/products                       # Criar produto (ADMIN/OWNER)
GET  /api/admin/orders                         # Listar pedidos (auto-cancela expirados)
GET  /api/admin/orders/shipped                 # Listar enviados/entregues/cancelados
GET  /api/admin/picking                        # Lista de separação (CONFIRMED/PROCESSING)
PATCH /api/admin/picking/[id]                  # Atualizar status (→ webhook)
GET  /api/admin/financial/config               # Config financeira (OWNER only)
PUT  /api/admin/financial/config               # Atualizar config (OWNER only)
```

#### **APIs de Integração (X-API-KEY)**
```
POST /api/integrations/stock/sync            # Sincronizar estoque (ML/Hiper)
POST /api/integrations/orders/update-status  # Webhook transportadora
GET  /api/integrations/marketing/abandoned-carts # Carrinhos abandonados (Bot)
```

---

## �🛠️ Stack Tecnológica

### Core
- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript (Strict Mode)
- **Banco de Dados**: PostgreSQL 16
- **ORM**: Prisma 5.15+
- **Autenticação**: NextAuth.js v5 (Auth.js)

### Frontend
- **UI Framework**: Tailwind CSS 3.4
- **Componentes**: Shadcn/UI (Radix UI)
- **Animações**: Framer Motion
- **Notificações**: React Sonner
- **Forms**: React Hook Form + Zod
- **QR Code**: qrcode (PIX payment)
- **i18n**: Custom PT-BR helpers

### Backend
- **HTTP Client**: Axios (Singleton com Interceptors)
- **Validação**: Zod (Schema Validation)
- **Hashing**: bcryptjs

### DevOps
- **Containerização**: Docker + Docker Compose
- **Email Testing**: Mailpit (SMTP local)

---

## 🌟 Funcionalidades Principais

### 🔐 Autenticação Multi-Provider
- ✅ Google OAuth 2.0
- ✅ Credentials (Email + Senha com bcrypt)
- ✅ Session JWT com HttpOnly Cookies
- ✅ RBAC: CUSTOMER, ADMIN, OWNER

### 📦 Gestão de Produtos
- ✅ Catálogo com categorias hierárquicas
- ✅ Variantes (110V/220V, cores, tamanhos)
- ✅ Múltiplas imagens por produto
- ✅ Specs em JSON (voltagem, potência, etc)
- ✅ Mapeamento físico de estoque (ex: "Corredor B - Prateleira 4")
- ✅ Integração com ML e Hiper (external IDs)

### 🛒 Carrinho e Pedidos
- ✅ Carrinho anônimo (sessionId) e autenticado (userId)
- ✅ Cálculo automático de frete e parcelamento
- ✅ Status tracking (PENDING → CONFIRMED → SHIPPED → DELIVERED)
- ✅ Integração com transportadoras via webhook

### 💳 Sistema de Pagamentos (Simulado)
- ✅ **PIX**: QR Code funcional gerado via `qrcode` library
- ✅ **Boleto**: Linha digitável e link para PDF mockado
- ✅ **Cartão**: Simulação de aprovação instantânea
- ✅ **Timer de 15 minutos**: Barra de progresso com contagem regressiva
- ✅ **Auto-cancelamento**: Backend cancela pedidos PENDING expirados
- ✅ **UX refinada**: Botão "Refazer pedido" ao expirar, desabilita ações
- ✅ Confirmação automática local (sem gateway real)

### 📦 Logística e Picking
- ✅ **Painel de Separação** (`/admin/picking`): Lista pedidos CONFIRMED/PROCESSING
- ✅ **Localização de estoque**: Corredor/Coluna/Altura para cada item
- ✅ **Dados do cliente**: Nome, telefone, endereço de entrega
- ✅ **Ações rápidas**: "Marcar em separação" (PROCESSING) e "Enviar ao ponto" (SHIPPED)
- ✅ **Rastreamento**: Campos trackingCode e trackingUrl
- ✅ **Painel de Enviados** (`/admin/orders/enviados`): SHIPPED/DELIVERED/CANCELLED/REFUNDED
- ✅ **Specs dos itens**: SKU, voltagem, cor, dimensões

### 🧾 Fiscal + B2B
- ✅ Campos fiscais em usuário: CPF/CNPJ + Inscrição Estadual (cadastro exige um doc fiscal)
- ✅ Campos fiscais em produto: NCM e Origem (cálculo de imposto / ERP)
- ✅ Orçamentos B2B: gera PDF timbrado e salva pedido com status `QUOTE` (não baixa estoque)
- ✅ Botão **Baixar Orçamento (PDF)** no carrinho com validade configurável e dados bancários
- ✅ Webhook `QUOTE` pronto para n8n/ERP receber orçamentos aprovados

### 🚚 Frete em Tempo Real
### 🚚 Frete em Tempo Real
 ✅ Service `ShippingCalculator` com peso/dimensões do catálogo
 ✅ Endpoint `POST /api/shipping/quote` retornando opções (Melhor Envio) + Retirada Feira de Santana
 ✅ Integração Melhor Envio (sandbox por padrão) com fallback local
 ✅ Seleção de frete no carrinho com CEP + cálculo dinâmico
 ✅ Opção padrão “Retirada na Loja (Feira de Santana)” com frete zero

### 🧭 SEO / Google Shopping
- ✅ Structured Data JSON-LD nos produtos (`/produtos/[id]`) com SKU, EAN, preço e estoque
- ✅ Disponibilidade `InStock/OutOfStock` e preço BRL expostos no `<head>`

### 🤖 Assistente RAG Seguro
- ✅ Endpoint `POST /api/assistant` com RAG leve em cima do catálogo (name/price/stock/sku/ean/specs)
- ✅ Guardrails anti-vazamento: somente SELECT de campos públicos, leitura read-only
- ✅ Prompt de escopo fechado (ferramentas/obras) e recusa automática de jailbreak/off-topic

### 🔔 Notificações (n8n Webhooks)
- ✅ **Helper centralizado** (`src/lib/webhooks.ts`)
- ✅ Notifica em: CONFIRMED (pagamento), PROCESSING, SHIPPED, DELIVERED
- ✅ Payload completo: orderId, status, user, trackingCode, timestamps
- ✅ **Best-effort**: Não quebra fluxo se webhook falhar
- ✅ Configurável via `N8N_ORDERS_WEBHOOK_URL` no .env

### 🌍 Internacionalização PT-BR
- ✅ **Status traduzidos**: PENDING → "Pendente", SHIPPED → "Enviado"
- ✅ **Badges coloridos**: Classes Tailwind por status (yellow, green, blue, gray)
- ✅ **Métodos de pagamento**: PIX → "PIX", CREDIT_CARD → "Cartão de Crédito"
- ✅ Aplicado em: Admin Dashboard, Pedidos, Picking, Enviados, Minha Conta
- ✅ Helpers: `statusToPt()`, `statusBadgeClass()`, `paymentToPt()` em `src/lib/i18n.ts`

### 💰 Módulo Financeiro (Exclusivo OWNER)
- ✅ Configuração de juros (cartão de crédito/débito)
- ✅ Parcelamento dinâmico (até 12x)
- ✅ Markup padrão para precificação
- ✅ Frete grátis condicional

### 🎟️ Sistema de Cupons Avançado
- ✅ Escopo: GLOBAL, CATEGORIA, PRODUTO, ESTADO
- ✅ Desconto percentual ou fixo
- ✅ Validação de data, uso limite e valor mínimo

### 📊 Logs e Auditoria
- ✅ StockLog: rastreamento de alterações de estoque
- ✅ IntegrationLog: auditoria de chamadas API
- ✅ ActivityLog: histórico de ações de usuários

---

## 🚀 Instalação e Setup

### Pré-requisitos
- Node.js 18.17+ e npm 9+
- Docker e Docker Compose
- Git

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/shopping-ferramentas.git
cd shopping-ferramentas
```

### 2. Configure Variáveis de Ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-uma-chave-secreta-forte-com-32-chars"
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"
X_INTERNAL_API_KEY="chave-para-integrações-externas"

# Webhook n8n (opcional - deixe vazio para desabilitar)
N8N_ORDERS_WEBHOOK_URL="https://seu-n8n.app.n8n.cloud/webhook/pedidos"

# Email (Mailpit para dev)
SMTP_HOST="localhost"
SMTP_PORT="1025"

# App
NEXT_PUBLIC_APP_NAME="Shopping das Ferramentas"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Inicie os Serviços (Docker)
```bash
docker-compose up -d
```

Isso criará:
- PostgreSQL em `localhost:5432`
- Mailpit em `localhost:8025` (Web UI)

### 4. Instale Dependências
```bash
npm install
```

### 5. Rode as Migrations
```bash
npx prisma migrate dev --name init
```

### 6. Popule o Banco (Seed)
```bash
npm run db:seed
```

Isso criará:
- 3 usuários (Owner, Admin, Customer)
- 5 produtos reais (Makita, Bosch, DeWalt)
- Categorias, cupons, banners
- 1 pedido de exemplo

### 7. Inicie o Servidor de Desenvolvimento
```bash
npm run dev
```

Acesse: **http://localhost:3000**

### 8. Credenciais de Acesso

| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Carlos Silva | dono@loja.com | senha123 | OWNER |
| Ana Paula Santos | gerente@loja.com | senha123 | ADMIN |
| João Pereira | cliente@gmail.com | senha123 | CUSTOMER |

---

## 📁 Estrutura de Pastas

```
shopping-ferramentas/
├── prisma/
│   ├── schema.prisma          # Schema do banco de dados
│   └── seed.ts                # Script de seed
├── src/
│   ├── app/
│   │   ├── (auth)/            # Rotas de autenticação
│   │   ├── (shop)/            # Rotas da loja (pública)
│   │   ├── admin/             # Painel admin (protegido)
│   │   │   └── financial/     # Painel OWNER only
│   │   ├── api/
│   │   │   ├── admin/         # APIs autenticadas
│   │   │   └── integrations/  # APIs externas (X-API-KEY)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                # Shadcn/UI components
│   │   ├── product-card.tsx
│   │   └── skeleton-card.tsx
│   ├── hooks/
│   │   └── use-price.ts       # Hook de parcelamento
│   ├── lib/
│   │   ├── api-client.ts      # Axios singleton
│   │   ├── prisma.ts          # Prisma client
│   │   ├── utils.ts           # Utilitários gerais
│   │   └── validations.ts     # Zod schemas
│   ├── middleware.ts          # RBAC e proteção de rotas
│   └── types/
│       └── next-auth.d.ts     # Type augmentation
├── auth.ts                    # NextAuth config
├── docker-compose.yml
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔐 Segurança e RBAC

### Hierarquia de Roles

| Role | Acesso |
|------|--------|
| **CUSTOMER** | Loja virtual, carrinho, pedidos próprios, perfil |
| **ADMIN** | Painel admin, gestão de produtos, pedidos, cupons. **NÃO** tem acesso ao Financeiro |
| **OWNER** | Acesso total, inclusive aba Financeiro (juros, relatórios de lucro) |

### Proteção de Rotas (Middleware)

**Arquivo:** [src/middleware.ts](src/middleware.ts)

```typescript
// Financeiro: apenas OWNER
if (pathname.startsWith('/admin/financial')) {
  if (session.user.role !== 'OWNER') {
    return NextResponse.redirect('/admin/unauthorized');
  }
}

// Admin: ADMIN ou OWNER
if (pathname.startsWith('/admin')) {
  if (session.user.role === 'CUSTOMER') {
    return NextResponse.redirect('/admin/unauthorized');
  }
}
```

### Proteção de APIs

**APIs de Integração** (`/api/integrations/*`):
- Requerem header `X-INTERNAL-API-KEY`
- Validado no middleware

**APIs Admin** (`/api/admin/*`):
- Requerem sessão autenticada
- Verificam role do usuário

---

## 🔌 Integrações (APIs)

### 🔽 Inbound (Entrada de Dados)

#### 1. Sincronização de Estoque
**Endpoint:** `POST /api/integrations/stock/sync`

**Headers:**
```
X-INTERNAL-API-KEY: sua-chave-secreta
```

**Body:**
```json
{
  "sku": "MAKITA-DHR243Z",
  "quantity": 50,
  "source": "MERCADO_LIVRE",
  "reason": "Venda ML #MLB123456"
}
```

**Resposta:**
```json
{
  "success": true,
  "product": {
    "id": "clx...",
    "sku": "MAKITA-DHR243Z",
    "name": "Martelete Rotativo...",
    "previousStock": 15,
    "newStock": 50,
    "difference": 35
  }
}
```

#### 2. Atualizar Status de Pedido
**Endpoint:** `POST /api/integrations/orders/update-status`

**Body:**
```json
{
  "orderNumber": "ORD-2025-000001",
  "status": "SHIPPED",
  "trackingCode": "BR123456789",
  "trackingUrl": "https://rastreio.correios.com.br/..."
}
```

### 🔼 Outbound (Saída de Dados)

#### 3. Carrinhos Abandonados
**Endpoint:** `GET /api/integrations/marketing/abandoned-carts?hours=24`

**Resposta:**
```json
{
  "success": true,
  "count": 3,
  "carts": [
    {
      "cartId": "...",
      "user": {
        "name": "João Pereira",
        "email": "cliente@gmail.com",
        "phone": "(71) 99999-0003"
      },
      "items": [...],
      "total": 1899.00,
      "abandonedAt": "2025-12-11T10:30:00Z"
    }
  ]
}
```

**Caso de Uso:** Bot de WhatsApp consome esta API e dispara mensagens de lembrete.

### 🔔 Webhooks n8n (Notificações)

**Configuração:**
1. Crie workflow no n8n com trigger Webhook
2. Copie a URL gerada
3. Adicione ao `.env.local`:
```env
N8N_ORDERS_WEBHOOK_URL="https://seu-n8n.app.n8n.cloud/webhook/pedidos"
```

**Eventos Enviados:**
- ✅ Pagamento confirmado (`CONFIRMED`)
- ✅ Em separação (`PROCESSING`)
- ✅ Enviado (`SHIPPED`) com trackingCode
- ✅ Entregue (`DELIVERED`)
- ✅ Atualização externa via webhook de transportadora

**Payload Exemplo:**
```json
{
  "type": "order.status.update",
  "timestamp": "2025-12-20T15:30:00.000Z",
  "orderId": "clx123",
  "orderNumber": "ORD-2025-000001",
  "status": "SHIPPED",
  "total": 1899.00,
  "user": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(71) 99999-0000"
  },
  "trackingCode": "BR123456789",
  "trackingUrl": "https://rastreio.com.br/...",
  "paidAt": "2025-12-20T15:00:00.000Z",
  "shippedAt": "2025-12-20T16:00:00.000Z"
}
```

**Arquivo:** [src/lib/webhooks.ts](src/lib/webhooks.ts)

---

## 🗄️ Modelagem de Dados

### Tabelas Principais

#### User
- `id`, `name`, `email`, `password`, `role`
- Relações: `orders[]`, `carts[]`

#### Product
- `sku` (unique), `ean`, `slug`, `name`, `price`, `stock`
- `stockLocation` (ex: "Corredor B - Prateleira 4")
- `specs` (JSONB: voltagem, potência)
- `externalIdML`, `externalIdHiper`
- Relações: `category`, `variants[]`, `images[]`

#### ProductVariant
- `sku` (unique), `name` (ex: "110V"), `attributes` (JSON)
- Sobrescreve preço e estoque do produto base

#### Order
- `orderNumber` (ex: ORD-2025-000001)
- `status`, `total`, `trackingCode`, `shippingAddress` (JSON)
- Relações: `user`, `items[]`, `coupon`

#### Coupon
- `code` (unique), `discountType`, `value`
- `scope` (GLOBAL | CATEGORY | PRODUCT | STATE)
- `scopeValues` (JSONB: ["BA", "SP"])

#### FinancialConfig (Singleton)
- `creditCardInterestRate`, `maxInstallments`
- `freeShippingMinValue`, `defaultMarkupPercentage`

#### Logs
- **StockLog**: rastreia alterações de estoque (source, previousQty, newQty)
- **IntegrationLog**: auditoria de API calls (endpoint, statusCode, success)
- **ActivityLog**: ações de usuários (action, entity, changes)

---

## 💰 Módulo Financeiro

### Configuração (Singleton)

Apenas **OWNER** pode acessar `/admin/financial` para editar:
- Taxa de juros do cartão de crédito (ex: 1.99% a.m.)
- Número máximo de parcelas (ex: 12x)
- Valor mínimo da parcela (ex: R$ 50,00)
- Frete grátis acima de (ex: R$ 200,00)

### Cálculo de Parcelamento (Frontend)

**Hook:** `usePrice(basePrice)`

```typescript
const { formatPrice, installmentOptions, bestInstallmentText } = usePrice(1899);

// Resultado:
// installmentOptions = [
//   { installments: 1, installmentValue: 1899, total: 1899, interestFree: true },
//   { installments: 2, installmentValue: 949.5, total: 1899, interestFree: true },
//   { installments: 3, installmentValue: 651.50, total: 1954.50, interestFree: false },
//   ...
// ]
```

Exibição na vitrine:
```tsx
<p className="text-2xl font-bold">{formatPrice(product.price)}</p>
<p className="text-xs">ou {bestInstallmentText()}</p>
```

---

## 📦 Logística e Picking

### Mapeamento Físico

Cada produto tem campo `stockLocation`:
```
"Corredor A - Prateleira 2"
"Corredor B - Prateleira 4"
```

### Lista de Separação (Admin)

**Página:** `/admin/picking`

Ordena itens de pedidos pendentes **alfabeticamente pela localização**:

| Localização | Produto | Qtd | Pedido |
|-------------|---------|-----|--------|
| Corredor A - Prateleira 2 | Martelete Makita | 1 | #000001 |
| Corredor A - Prateleira 3 | Parafusadeira | 2 | #000003 |
| Corredor B - Prateleira 1 | Esmerilhadeira | 1 | #000002 |

**Benefício:** Estoquista percorre o depósito de forma otimizada.

---

## 🎨 Marketing e UX

### Design Industrial Modern

**Paleta de Cores:**
- Primária: Laranja (#f97316)
- Neutra: Cinza/Metálico (#64748b, #cbd5e1)
- Acento: Preto fosco (#0f172a)

### Animações (Framer Motion)

**Efeito Lift nos Cards:**
```tsx
<motion.div
  whileHover={{ y: -8 }}
  transition={{ duration: 0.3 }}
  className="lift-effect"
>
  <ProductCard />
</motion.div>
```

### Skeleton Loading

Durante carregamento de produtos:
```tsx
{loading ? (
  <SkeletonCard />
) : (
  <ProductCard product={product} />
)}
```

### Optimistic UI

Botão "Adicionar ao Carrinho" com feedback instantâneo:
```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  onClick={handleAddToCart}
>
  Adicionar
</motion.button>
```

### Banners Gerenciáveis

Admin pode criar banners com:
- Imagem, link, ordem de exibição
- Data de início/fim (agendamento)

---

## � Guias Detalhados

Este projeto inclui documentação completa dividida em múltiplos guias especializados:

### 🎨 [FRONTEND-GUIDE.md](./docs/FRONTEND-GUIDE.md) 
**Guia Completo do Frontend & UX/UI**
- Arquitetura do Storefront (Homepage, PLP, PDP)
- Páginas de autenticação (Login, Registro)
- Área do usuário (Perfil, Pedidos, Endereços)
- Painel administrativo completo
- Componentes UI (Shadcn/UI)
- Fluxos de navegação
- Responsividade e animações
- SEO e acessibilidade

### 🎨 [DESIGN-GUIDE.md](./docs/DESIGN-GUIDE.md)
**Design System Completo**
- Paleta de cores (Primary, Metallic, Semantic)
- Tipografia e hierarquia
- Sistema de espaçamento (4px grid)
- Componentes de UI (Botões, Cards, Inputs, Badges)
- Layouts responsivos
- Animações (Framer Motion)
- Estados de UI (Loading, Empty, Error)
- Toast notifications
- Acessibilidade (a11y)

### 🗺️ [ROTAS.md](./docs/ROTAS.md)
**Mapa Completo de Rotas**
- Todas as rotas públicas e protegidas
- Parâmetros e query strings
- Proteções RBAC
- APIs e endpoints

### 🏛️ [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
**Arquitetura Técnica do Sistema**
- Regra de Ouro (Cérebro Passivo)
- Stack tecnológica detalhada
- Padrões de código
- Server Components vs Client Components
- Autenticação e segurança
- Caching strategies

### 🔌 [API.md](./docs/API.md)
**Referência Completa de APIs**
- APIs públicas (produtos, config)
- APIs autenticadas (user, admin)
- APIs de integração (stock, orders, marketing)
- Headers necessários (X-API-KEY, Authorization)
- Exemplos de requests/responses
- Tratamento de erros

### 🛠️ [INSTALL.md](./docs/INSTALL.md)
**Guia de Instalação Passo a Passo**
- Pré-requisitos
- Configuração Docker
- Variáveis de ambiente
- Migrações e seed
- Troubleshooting

### 📜 [SCRIPTS.md](./docs/SCRIPTS.md)
**Referência de Scripts**
- Comandos npm
- Scripts Prisma
- Docker commands
- Git workflows
- Debugging

### 🚀 [DEPLOY.md](./docs/DEPLOY.md)
**Checklist de Deploy**
- Vercel deployment
- Configuração de produção
- Banco de dados (Neon, Supabase)
- Variáveis de ambiente
- Monitoring e analytics

### 📊 [EXECUTIVE-SUMMARY.md](./docs/EXECUTIVE-SUMMARY.md)
**Visão Executiva do Projeto**
- Objetivos de negócio
- Stakeholders
- ROI esperado
- Roadmap futuro

### 🗂️ [PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md)
**Estrutura Visual de Pastas**
- Árvore completa de diretórios
- Convenções de nomenclatura
- Organização de componentes
- Assets e recursos

### ⚡ [QUICKSTART.md](./docs/QUICKSTART.md)
**Setup em 5 Minutos**
- Comandos essenciais
- Credenciais de teste
- Verificação de instalação

---

## �📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia Next.js em modo dev

# Build
npm run build            # Build para produção
npm start                # Inicia servidor produção

# Banco de Dados
npm run db:generate      # Gera Prisma Client
npm run db:push          # Sincroniza schema (dev)
npm run db:migrate       # Cria migration
npm run db:studio        # Abre Prisma Studio (GUI)
npm run db:seed          # Popula banco com dados de exemplo

# Linting
npm run lint             # ESLint
```

---

## 🚢 Deploy em Produção

### Vercel (Recomendado)

1. **Push para GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Conecte no Vercel**
- Acesse [vercel.com](https://vercel.com)
- Import repository
- Configure variáveis de ambiente:
  - `DATABASE_URL` (use serviço como Neon, Supabase ou Railway)
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `X_INTERNAL_API_KEY`

3. **Deploy Automático**
- Cada push em `main` dispara deploy

### Banco de Dados (Produção)

**Opções:**
- [Neon](https://neon.tech) (PostgreSQL serverless)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

**Migração:**
```bash
npx prisma migrate deploy
```

---

## 🧪 Testes Locais

### Testar API de Integração (cURL)

```bash
curl -X POST http://localhost:3000/api/integrations/stock/sync \
  -H "X-INTERNAL-API-KEY: sua-chave" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "MAKITA-DHR243Z",
    "quantity": 100,
    "source": "MERCADO_LIVRE"
  }'
```

### Testar Email (Mailpit)

1. Acesse: http://localhost:8025
2. Emails enviados pela aplicação aparecerão aqui

---

## 🤝 Contribuição

### Workflow Git

1. Crie branch feature:
```bash
git checkout -b feature/nova-funcionalidade
```

2. Commit com mensagens semânticas:
```bash
git commit -m "feat: adiciona filtro por categoria"
```

3. Push e abra Pull Request

### Padrões de Código

- **TypeScript Strict Mode** habilitado
- **ESLint** configurado (Next.js)
- **Componentes**: PascalCase
- **Funções**: camelCase
- **Arquivos**: kebab-case

---

## 📞 Suporte

**Desenvolvedor Principal:** CTO & Arquiteto Sênior  
**Email:** suporte@shoppingferramentas.com.br  
**Documentação API:** `/docs/api` (Swagger - a implementar)

---

## ✅ Checklist Completo

Confira o status completo do projeto:

📄 **[Checklist Detalhado](./docs/CHECKLIST.md)** - Status de todas as entregas  
📄 **[Mapa de Páginas](./docs/PAGINAS.md)** - Todas as 13 páginas documentadas

### Resumo Rápido
- ✅ **15+ páginas** implementadas (Públicas, Admin, Pagamento, Picking)
- ✅ **Pagamento simulado** com PIX QR Code e auto-cancelamento (15min)
- ✅ **Sistema de Picking** com localização e rastreio
- ✅ **Webhooks n8n** para notificações de status
- ✅ **Interface 100% PT-BR** (status, badges, labels)
- ✅ **15+ APIs** criadas (autenticadas e integração)
- ✅ **12+ documentos** de documentação (15.000+ linhas)
- ✅ **Framer Motion** em todas as páginas
- ✅ **Design responsivo** mobile-first
- ✅ **Autenticação completa** (Google OAuth + Credentials)
- ✅ **RBAC** implementado (CUSTOMER/ADMIN/OWNER)
- ✅ **20.000+ linhas de código**

---

## 📄 Licença

Proprietary - Shopping das Ferramentas © 2025

---

## 🎯 Destaques Técnicos

### 💳 Sistema de Pagamentos
**Arquivos principais:**
- [src/app/pagamento/[id]/page.tsx](src/app/pagamento/[id]/page.tsx) - Página de pagamento com timer
- [src/app/api/orders/[id]/payment/route.ts](src/app/api/orders/[id]/payment/route.ts) - API de processamento
- [src/lib/pix.ts](src/lib/pix.ts) - Helper de geração de QR Code

**Features:**
- QR Code PIX funcional (gerado via `qrcode` library)
- Countdown de 15 minutos com barra de progresso
- Auto-cancelamento no backend (múltiplos endpoints)
- UX polida: horário de expiração, botão "Refazer pedido"

### 📦 Sistema de Picking
**Arquivos principais:**
- [src/app/admin/picking/page.tsx](src/app/admin/picking/page.tsx) - Dashboard de separação
- [src/app/api/admin/picking/route.ts](src/app/api/admin/picking/route.ts) - Lista de itens
- [src/app/api/admin/picking/[id]/route.ts](src/app/api/admin/picking/[id]/route.ts) - Transição de status
- [src/app/admin/orders/enviados/page.tsx](src/app/admin/orders/enviados/page.tsx) - Pedidos enviados

**Features:**
- Lista otimizada por localização de estoque
- Dados do cliente (nome, telefone, endereço completo)
- Ações: "Marcar em separação" e "Enviar ao ponto de coleta"
- Rastreamento com código e URL

### 🔔 Webhooks n8n
**Arquivo:** [src/lib/webhooks.ts](src/lib/webhooks.ts)

**Integrações:**
- Pagamento confirmado → notifica
- Status atualizado (PROCESSING, SHIPPED, DELIVERED) → notifica
- Entrega confirmada → notifica
- Atualização externa (transportadora) → notifica

**Payload completo:** orderId, status, user, tracking, timestamps

### 🌍 PT-BR Global
**Arquivo:** [src/lib/i18n.ts](src/lib/i18n.ts)

**Funções:**
- `statusToPt(status)` - Traduz status para português
- `statusBadgeClass(status)` - Retorna classes Tailwind por status
- `paymentToPt(method)` - Traduz métodos de pagamento

**Aplicado em:** Admin Dashboard, Orders, Picking, Enviados, Minha Conta

---

## 🎯 Roadmap

### ✅ Concluído
- [x] Homepage com Hero, Categories, Featured Products
- [x] Produtos (Listagem) com filtros avançados
- [x] Produto (Detalhe) com Buy Box
- [x] Carrinho de Compras
- [x] **Pagamento simulado** (PIX QR Code, Boleto, Cartão)
- [x] **Auto-cancelamento** após 15 minutos
- [x] **Timer visual** com barra de progresso
- [x] Ofertas
- [x] Login/Registro (OAuth + Credentials)
- [x] Minha Conta (3 abas) com status PT-BR
- [x] Admin Dashboard modernizado com badges PT-BR
- [x] **Painel de Picking** (separação de pedidos)
- [x] **Painel de Enviados** (rastreamento)
- [x] **Webhooks n8n** para notificações
- [x] **Interface 100% PT-BR**
- [x] Sobre, Contato, Privacidade
- [x] Animações Framer Motion
- [x] 12+ documentos de documentação

### 🔮 Próximos Passos (Opcional)
- [ ] FAQ
- [ ] Blog
- [x] Checkout (fluxo completo)
- [ ] Wishlist (Lista de Desejos)
- [ ] Comparação de produtos
- [ ] Reviews e avaliações
- [ ] Adicionar testes E2E (Playwright)
- [ ] Implementar Swagger para documentação de APIs
- [ ] Dashboard de Analytics (Vendas, Conversão)
- [x] Módulo de Relatórios (PDF/Excel)
- [ ] Integração com Gateway de Pagamento (Mercado Pago)
- [ ] App Mobile (React Native)
- [x] Chat de Atendimento (AI-powered)
- [ ] PWA (Progressive Web App)
- [ ] Dark Mode
- [ ] Internacionalização (i18n)

---

## 🙏 Agradecimentos

Construído com ❤️ usando tecnologias open-source:
- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [NextAuth.js](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/UI](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion/)

---

**🛠️ Happy Coding!** 🚀
