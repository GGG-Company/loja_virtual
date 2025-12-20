# 🛒 Shopping das Ferramentas - Hub Omni-channel

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
1. **Loja Física** (Salvador, BA)
2. **Mercado Livre** (vendas online)
3. **Loja Virtual** (este projeto) - **Vitrine Oficial + Hub Centralizador**

### Objetivo do Projeto

Criar um **E-commerce Completo** que:
- ✅ Vitrine profissional de produtos (Homepage, Listagem, Detalhes)
- ✅ Sistema de autenticação robusto (Google OAuth + Email/Senha)
- ✅ Área do usuário (Perfil, Pedidos, Endereços)
- ✅ Painel administrativo moderno com RBAC
- ✅ Dashboard com estatísticas em tempo real
- ✅ APIs de integração protegidas
- ✅ Módulo financeiro exclusivo para OWNER
- ✅ Sistema de separação de pedidos (Picking)
- ✅ Animações Framer Motion em todas as páginas
- ✅ Design responsivo e moderno
- ✅ 13 páginas completas (Públicas, Admin, Institucionais)

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
| `/minha-conta?tab=pedidos` | Histórico de pedidos | Session required |
| `/minha-conta?tab=enderecos` | Gerenciar endereços | Session required |

### **Painel Administrativo (RBAC)**

| Rota | Descrição | Role Necessário |
|------|-----------|-----------------|
| `/admin/dashboard` | Dashboard com stats e gráficos | ADMIN, OWNER |
| `/admin/products` | CRUD de produtos | ADMIN, OWNER |
| `/admin/orders` | Gestão de pedidos | ADMIN, OWNER |
| `/admin/picking` | Lista de separação otimizada | ADMIN, OWNER |
| `/admin/financial` | Configuração de juros e relatórios | **OWNER ONLY** |
| `/admin/settings` | Configurações gerais | ADMIN, OWNER |

### **APIs (Backend)**

#### **APIs Públicas**
```
GET /api/products                # Listar produtos
GET /api/products/[id]           # Detalhe do produto
GET /api/financial/config        # Config pública (juros, parcelas)
```

#### **APIs Autenticadas (Session)**
```
POST /api/auth/register          # Criar conta
GET  /api/user/orders            # Pedidos do usuário logado
GET  /api/admin/stats            # Estatísticas do dashboard (ADMIN/OWNER)
GET  /api/admin/products         # Listar produtos (ADMIN/OWNER)
POST /api/admin/products         # Criar produto (ADMIN/OWNER)
GET  /api/admin/financial/config # Config financeira (OWNER only)
PUT  /api/admin/financial/config # Atualizar config (OWNER only)
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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopping_ferramentas?schema=public"
NEXTAUTH_SECRET="gere-uma-chave-secreta-forte-com-32-chars"
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"
X_INTERNAL_API_KEY="chave-para-integrações-externas"
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
- ✅ **13 páginas** implementadas (Públicas, Admin, Institucionais)
- ✅ **11 componentes UI** customizados
- ✅ **5 APIs** criadas
- ✅ **12 documentos** de documentação (12.000+ linhas)
- ✅ **Framer Motion** em todas as páginas
- ✅ **Design responsivo** mobile-first
- ✅ **Autenticação completa** (Google OAuth + Credentials)
- ✅ **RBAC** implementado
- ✅ **16.000+ linhas de código**

---

## 📄 Licença

Proprietary - Shopping das Ferramentas © 2025

---

## 🎯 Roadmap

### ✅ Concluído
- [x] Homepage com Hero, Categories, Featured Products
- [x] Produtos (Listagem) com filtros avançados
- [x] Produto (Detalhe) com Buy Box
- [x] Carrinho de Compras
- [x] Ofertas
- [x] Login/Registro (OAuth + Credentials)
- [x] Minha Conta (3 abas)
- [x] Admin Dashboard modernizado
- [x] Sobre, Contato, Privacidade
- [x] Animações Framer Motion
- [x] 12 documentos de documentação

### 🔮 Próximos Passos (Opcional)
- [ ] FAQ
- [ ] Blog
- [ ] Checkout (fluxo completo)
- [ ] Wishlist (Lista de Desejos)
- [ ] Comparação de produtos
- [ ] Reviews e avaliações
- [ ] Adicionar testes E2E (Playwright)
- [ ] Implementar Swagger para documentação de APIs
- [ ] Dashboard de Analytics (Vendas, Conversão)
- [ ] Módulo de Relatórios (PDF/Excel)
- [ ] Integração com Gateway de Pagamento (Mercado Pago)
- [ ] App Mobile (React Native)
- [ ] Chat de Atendimento (AI-powered)
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
