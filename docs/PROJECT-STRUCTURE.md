# 📂 ESTRUTURA COMPLETA DO PROJETO

Visualização detalhada de toda a arquitetura de pastas e arquivos.

```
loja_virtual/
│
├── 📄 Arquivos de Configuração Raiz
│   ├── package.json                    # Dependências e scripts npm
│   ├── tsconfig.json                   # Configuração TypeScript
│   ├── next.config.mjs                 # Configuração Next.js
│   ├── tailwind.config.ts              # Configuração Tailwind CSS
│   ├── postcss.config.mjs              # PostCSS (Tailwind)
│   ├── docker-compose.yml              # PostgreSQL + Mailpit
│   ├── .env                            # Variáveis de ambiente (não commitar!)
│   ├── .env.example                    # Template de .env
│   ├── .gitignore                      # Arquivos ignorados pelo Git
│   ├── auth.ts                         # Configuração NextAuth v5
│   │
│   └── 📚 Documentação
│       ├── README.md                   # Documentação principal
│       ├── ARCHITECTURE.md             # Arquitetura detalhada
│       ├── API.md                      # Referência de endpoints
│       ├── INSTALL.md                  # Guia de instalação
│       ├── SCRIPTS.md                  # Comandos úteis
│       ├── DEPLOY.md                   # Checklist de deploy
│       └── EXECUTIVE-SUMMARY.md        # Resumo executivo
│
├── 🗄️ prisma/
│   ├── schema.prisma                   # Schema do banco (15 tabelas)
│   └── seed.ts                         # Seed com produtos reais
│
└── 📁 src/
    │
    ├── 🎨 app/                         # Next.js App Router
    │   ├── globals.css                 # Estilos globais (Tailwind)
    │   ├── layout.tsx                  # Layout raiz
    │   ├── page.tsx                    # Homepage
    │   │
    │   ├── 🔐 (auth)/                  # Rotas de autenticação
    │   │   ├── login/
    │   │   │   └── page.tsx            # Página de login
    │   │   ├── register/
    │   │   │   └── page.tsx            # Página de registro
    │   │   └── error/
    │   │       └── page.tsx            # Página de erro de auth
    │   │
    │   ├── 🛒 (shop)/                  # Rotas públicas da loja
    │   │   ├── products/
    │   │   │   ├── page.tsx            # Lista de produtos
    │   │   │   └── [slug]/
    │   │   │       └── page.tsx        # Detalhe do produto
    │   │   ├── categories/
    │   │   │   └── [slug]/
    │   │   │       └── page.tsx        # Produtos por categoria
    │   │   ├── cart/
    │   │   │   └── page.tsx            # Carrinho de compras
    │   │   └── checkout/
    │   │       └── page.tsx            # Finalização de compra
    │   │
    │   ├── 🛡️ admin/                   # Painel administrativo (protegido)
    │   │   ├── layout.tsx              # Layout com sidebar
    │   │   ├── dashboard/
    │   │   │   └── page.tsx            # Dashboard com estatísticas
    │   │   ├── products/
    │   │   │   ├── page.tsx            # Lista de produtos
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx        # Criar produto
    │   │   │   └── [id]/
    │   │   │       └── edit/
    │   │   │           └── page.tsx    # Editar produto
    │   │   ├── orders/
    │   │   │   ├── page.tsx            # Lista de pedidos
    │   │   │   └── [id]/
    │   │   │       └── page.tsx        # Detalhe do pedido
    │   │   ├── picking/
    │   │   │   └── page.tsx            # Lista de separação otimizada
    │   │   ├── coupons/
    │   │   │   └── page.tsx            # Gestão de cupons
    │   │   ├── banners/
    │   │   │   └── page.tsx            # Gestão de banners
    │   │   │
    │   │   └── 💰 financial/           # Módulo financeiro (OWNER ONLY)
    │   │       ├── config/
    │   │       │   └── page.tsx        # Configuração de juros
    │   │       └── reports/
    │   │           └── page.tsx        # Relatórios de lucro
    │   │
    │   ├── 🔌 api/                     # API Routes (Backend)
    │   │   │
    │   │   ├── auth/
    │   │   │   └── [...nextauth]/
    │   │   │       └── route.ts        # NextAuth handlers
    │   │   │
    │   │   ├── financial/
    │   │   │   └── config/
    │   │   │       └── route.ts        # GET config pública
    │   │   │
    │   │   ├── 🛡️ admin/              # APIs autenticadas (Session)
    │   │   │   ├── products/
    │   │   │   │   └── route.ts        # GET/POST produtos
    │   │   │   ├── orders/
    │   │   │   │   └── route.ts        # Gestão de pedidos
    │   │   │   └── financial/
    │   │   │       └── config/
    │   │   │           └── route.ts    # GET/PUT config (OWNER)
    │   │   │
    │   │   └── 🔗 integrations/       # APIs externas (X-API-KEY)
    │   │       ├── stock/
    │   │       │   └── sync/
    │   │       │       └── route.ts    # POST - Sincronizar estoque
    │   │       ├── orders/
    │   │       │   └── update-status/
    │   │       │       └── route.ts    # POST - Webhook transportadora
    │   │       └── marketing/
    │   │           └── abandoned-carts/
    │   │               └── route.ts    # GET - Carrinhos abandonados
    │   │
    │   └── ⚡ actions/                 # Server Actions
    │       ├── products.ts             # createProduct, updateStock
    │       ├── orders.ts               # createOrder, updateStatus
    │       └── coupons.ts              # applyCoupon, validateCoupon
    │
    ├── 🎨 components/                  # Componentes React
    │   ├── ui/                         # Shadcn/UI components
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── select.tsx
    │   │   ├── tabs.tsx
    │   │   └── toast.tsx
    │   │
    │   ├── product-card.tsx            # Card de produto (Framer Motion)
    │   ├── skeleton-card.tsx           # Loading skeleton
    │   ├── banner-carousel.tsx         # Carrossel de banners
    │   ├── cart-drawer.tsx             # Drawer do carrinho
    │   └── navbar.tsx                  # Navegação principal
    │
    ├── 🎣 hooks/                       # Custom Hooks
    │   ├── use-price.ts                # Cálculo de parcelamento
    │   ├── use-cart.ts                 # Gestão de carrinho
    │   └── use-toast.ts                # Notificações
    │
    ├── 📚 lib/                         # Bibliotecas e Utils
    │   ├── prisma.ts                   # Prisma Client (Singleton)
    │   ├── api-client.ts               # Axios com Interceptors
    │   ├── validations.ts              # Zod Schemas
    │   └── utils.ts                    # Funções utilitárias
    │
    ├── 🔒 middleware.ts                # RBAC e proteção de rotas
    │
    └── 📝 types/                       # TypeScript Definitions
        ├── next-auth.d.ts              # Augmentation NextAuth
        └── global.d.ts                 # Types globais

```

---

## 📊 Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| **Total de Arquivos** | 60+ |
| **Linhas de Código** | ~5.000 |
| **Tabelas no Banco** | 15 |
| **API Endpoints** | 10+ |
| **Componentes React** | 15+ |
| **Server Actions** | 8+ |
| **Custom Hooks** | 3 |
| **Documentação (MD)** | 7 arquivos |

---

## 🎯 Principais Diretórios

### `/prisma` - Camada de Dados
- **schema.prisma**: Modelagem completa (User, Product, Order, Logs)
- **seed.ts**: População com produtos reais (Makita, Bosch, DeWalt)

### `/src/app` - Frontend & Backend
- **App Router**: Organização por funcionalidade
- **API Routes**: Separação clara (admin vs integrations)
- **Server Actions**: Lógica de negócio no servidor

### `/src/components` - UI Components
- **Shadcn/UI**: Base de componentes acessíveis
- **Custom**: ProductCard com animações (Framer Motion)

### `/src/lib` - Core Libraries
- **Prisma**: Database client
- **Axios**: HTTP client configurado
- **Validations**: Schemas Zod reutilizáveis

### `/src/hooks` - Business Logic
- **usePrice**: Cálculo de parcelamento dinâmico
- **useCart**: Gestão de estado do carrinho

---

## 🔑 Arquivos Críticos

| Arquivo | Função |
|---------|--------|
| `auth.ts` | Configuração de autenticação (Google + Credentials) |
| `middleware.ts` | Proteção RBAC de rotas e APIs |
| `schema.prisma` | Schema completo do banco de dados |
| `seed.ts` | Dados de exemplo para desenvolvimento |
| `.env` | Variáveis de ambiente (**nunca commitar!**) |

---

## 🎨 Convenções de Nomenclatura

### Arquivos
- **Components**: PascalCase (`ProductCard.tsx`)
- **Pages**: kebab-case (`dashboard/page.tsx`)
- **Utils**: camelCase (`api-client.ts`)

### Pastas
- **App Router**: kebab-case (`admin/financial`)
- **Grupos de Rota**: parênteses `(auth)`, `(shop)`

### Código
- **Componentes**: PascalCase (`function ProductCard()`)
- **Funções**: camelCase (`function calculatePrice()`)
- **Constantes**: UPPER_SNAKE_CASE (`const MAX_ITEMS = 10`)

---

## 🚀 Como Navegar no Projeto

1. **Começar pelo README.md**: Visão geral
2. **Entender o Schema**: `prisma/schema.prisma`
3. **Ver APIs**: `src/app/api/integrations/*`
4. **Estudar Middleware**: `src/middleware.ts`
5. **Explorar Componentes**: `src/components/product-card.tsx`
6. **Ver Server Actions**: `src/app/actions/products.ts`

---

## 💡 Dicas de Desenvolvimento

### Adicionar Nova Funcionalidade

1. **Modelar no Prisma** (`schema.prisma`)
2. **Criar Migration** (`npx prisma migrate dev`)
3. **Criar API Route** (`app/api/admin/new-feature/route.ts`)
4. **Criar Server Action** (se necessário)
5. **Criar Componente UI** (`components/new-feature.tsx`)
6. **Adicionar Rota no App** (`app/admin/new-feature/page.tsx`)

### Debugar Problemas

1. **Prisma Studio**: Ver dados do banco (`npm run db:studio`)
2. **Logs do Console**: Erros de API aparecem no terminal
3. **Network Tab**: Ver requests HTTP no DevTools
4. **Mailpit**: Verificar emails enviados (`http://localhost:8025`)

---

**Estrutura projetada para escalabilidade, manutenibilidade e segurança.** 🏗️
