# 🛍️ GUIA COMPLETO DO E-COMMERCE - Frontend & UX/UI

## 📖 Índice

1. [Arquitetura do Storefront](#arquitetura-do-storefront)
2. [Páginas Públicas](#páginas-públicas)
3. [Área do Usuário](#área-do-usuário)
4. [Painel Administrativo](#painel-administrativo)
5. [Componentes UI](#componentes-ui)
6. [Fluxos de Navegação](#fluxos-de-navegação)

---

## 🏗️ Arquitetura do Storefront

### Stack Visual
```
Next.js 14 (App Router)
├── Tailwind CSS (Utility-First)
├── Shadcn/UI (Component Library)
├── Framer Motion (Animações)
├── Lucide React (Ícones)
└── Sonner (Toasts)
```

### Design System

**Cores Principais:**
- **Primary**: Azul `#2563EB` (BTOs, CTAs)
- **Metallic**: Cinza `#1F2937` → `#F3F4F6` (Backgrounds)
- **Success**: Verde `#10B981`
- **Warning**: Amarelo `#F59E0B`
- **Error**: Vermelho `#EF4444`

**Tipografia:**
- Headings: `font-bold` (600-800)
- Body: `font-normal` (400)
- Small: `text-sm`, `text-xs`

---

## 📄 Páginas Públicas

### 1. **Homepage** (`/`)
**Arquivo:** `src/app/page.tsx`

**Seções:**
1. **Hero Section** (`src/components/hero-section.tsx`)
   - Banner principal com gradiente
   - CTA "Ver Produtos" e "Explorar Categorias"
   - Badges de benefícios (Frete Grátis, Garantia, Entrega Rápida)

2. **Categories Grid** (`src/components/categories-grid.tsx`)
   - 4 cards de categorias principais:
     - Ferramentas Elétricas 🔧
     - Ferramentas Manuais 🔨
     - Jardinagem 🌿
     - EPIs 🦺
   - Links para `/produtos?categoria=slug`

3. **Featured Products** (`src/components/featured-products.tsx`)
   - Grid 4 colunas (responsivo)
   - Produtos marcados como `is_featured=true`
   - Cards com hover lift effect

**Componentes Utilizados:**
- `Header` (com busca e carrinho)
- `Footer` (links, contato, redes sociais)
- `ProductCard` (preço, parcelamento, botão comprar)

---

### 2. **Página de Produtos (PLP)** (`/produtos`)
**Arquivo:** `src/app/produtos/page.tsx`

**Funcionalidades:**

**Sidebar de Filtros:**
```typescript
- Faixa de Preço (Slider R$ 0 - R$ 5.000)
- Marcas (Checkboxes: Makita, Bosch, DeWalt...)
- Voltagem (110V, 220V, Bivolt, Bateria)
- Botão "Aplicar Filtros"
```

**Toolbar Superior:**
- Badge com total de produtos
- Botão "Filtros" (mobile)
- Select de ordenação:
  - Mais Recentes
  - Menor Preço
  - Maior Preço
  - Nome A-Z

**Grid de Produtos:**
- 3 colunas desktop / 2 colunas tablet / 1 coluna mobile
- Lazy loading com skeleton states
- Animações stagger (Framer Motion)

**Query Params Suportados:**
```
/produtos?categoria=ferramentas-eletricas
/produtos?featured=true&limit=4
```

---

### 3. **Página de Detalhe do Produto (PDP)** (`/produtos/[id]`)
**Arquivo:** `src/app/produtos/[id]/page.tsx`

**Estrutura:**

**Coluna Esquerda - Galeria:**
- Imagem principal (aspect-square)
- Thumbnails (futuro)

**Coluna Direita - Buy Box:**
```tsx
1. Categoria (badge)
2. Título do Produto (h1)
3. Rating (5 estrelas)
4. Preço:
   - De: R$ XXX (riscado)
   - Por: R$ XXX (destaque)
   - Parcelamento: 12x de R$ XX
5. Seletor de Voltagem* (se houver variants)
6. Seletor de Quantidade (+/-)
7. Botões:
   - "Adicionar ao Carrinho" (primary)
   - Favoritar (outline, coração)
8. Features (Frete, Garantia, Parcelamento)
```

**Abaixo do Hero:**
- **Descrição:** Texto completo do produto
- **Especificações Técnicas:** Tabela com `specs` (JSONB)
  - Potência, Peso, Voltagem, RPM, etc.

**API Endpoint:**
```
GET /api/products/[id]
Retorna: { product, category, variants[] }
```

---

### 4. **Páginas de Autenticação**

#### **Login** (`/auth/login`)
**Arquivo:** `src/app/auth/login/page.tsx`

**Features:**
- OAuth Google (botão com ícone SVG)
- Login por Email/Senha
- Link "Esqueceu sua senha?"
- Link para `/auth/register`
- **Credenciais de teste** (card destacado):
  ```
  Owner: dono@loja.com / senha123
  Admin: gerente@loja.com / senha123
  Cliente: cliente@gmail.com / senha123
  ```

**Componentes:**
- `Input` (Shadcn)
- `Label`
- `Button`
- Gradiente de fundo `from-primary-50 via-white to-metallic-100`

#### **Registro** (`/auth/register`)
**Arquivo:** `src/app/auth/register/page.tsx`

**Campos:**
- Nome Completo (required)
- Email (required, validação)
- Telefone (opcional)
- Senha (min 8 caracteres)
- Confirmar Senha (match validation)

**API:**
```
POST /api/auth/register
Body: { name, email, password, phone }
Retorna: { user } (role=CUSTOMER por padrão)
```

---

## 👤 Área do Usuário

### **Minha Conta** (`/minha-conta`)
**Arquivo:** `src/app/minha-conta/page.tsx`

**Layout:**
- **Sidebar:** Tabs de navegação
  - Meu Perfil 👤
  - Meus Pedidos 📦
  - Endereços 📍

**Tab 1: Meu Perfil**
- Form com dados pessoais (nome, email, telefone, CPF)
- Email desabilitado (read-only)
- Botão "Salvar Alterações"

**Tab 2: Meus Pedidos**
```tsx
Se orders.length === 0:
  - Ícone de package vazio
  - "Você ainda não fez nenhum pedido"
  - Botão CTA "Começar a Comprar"

Senão:
  - Cards de pedidos:
    - Pedido #ID (primeiros 8 chars)
    - Data de criação
    - Status (badge colorido)
    - Total (destaque)
```

**API:**
```
GET /api/user/orders
Headers: Cookie (session)
Retorna: { orders[] }
```

**Tab 3: Endereços**
- Estado vazio com ícone MapPin
- Botão "Adicionar Endereço" (futuro)

**Proteção:**
- `useSession()` → Se `unauthenticated`, redirect para `/auth/login`

---

## 🛡️ Painel Administrativo

### **Layout Admin** (`/admin/*`)
**Arquivo:** `src/app/admin/layout.tsx`

**Sidebar Fixa:**
```tsx
Componentes:
├── Logo "🔨 Admin"
├── User Info Card (nome, email, badge de role)
├── Menu de Navegação:
│   ├── Dashboard 📊
│   ├── Produtos 📦
│   ├── Pedidos 🛒
│   ├── Separação 📋
│   ├── Financeiro 💰 (OWNER only)
│   └── Configurações ⚙️
└── Botão Logout (vermelho)
```

**Proteção RBAC:**
```typescript
useSession() → role !== 'CUSTOMER'
Se CUSTOMER → redirect('/')
Se unauthenticated → redirect('/auth/login')
```

**Responsivo:**
- Desktop: Sidebar fixa (264px)
- Mobile: Hamburger menu (overlay)

---

### **Dashboard** (`/admin/dashboard`)
**Arquivo:** `src/app/admin/dashboard/page.tsx`

**Componentes:**

**1. Stats Cards (Grid 4 colunas):**
```tsx
[
  { label: 'Produtos Cadastrados', value: 150, icon: Package, color: blue },
  { label: 'Pedidos Total', value: 420, icon: ShoppingCart, color: green },
  { label: 'Pedidos Pendentes', value: 12, icon: Clock, color: yellow },
  { label: 'Faturamento', value: 'R$ 125.430,00', icon: DollarSign, color: primary },
]
```

**Cards Features:**
- Gradiente superior (2px)
- Ícone em badge colorido
- Ícone TrendingUp (canto superior direito)
- Hover: scale do badge

**2. Recent Orders (Grid 2 colunas):**
- Últimos 5 pedidos
- Pedido #ID, Data, Status (badge), Total

**3. Low Stock Alert:**
- Produtos com `stock_quantity <= 10`
- Background laranja (`bg-orange-50`)
- SKU e quantidade

**API:**
```
GET /api/admin/stats
Headers: Cookie (session)
Retorna: { totalProducts, totalOrders, pendingOrders, totalRevenue, recentOrders[], lowStockProducts[] }
```

---

### **Produtos** (`/admin/products`)
**Features:**
- Tabela com paginação
- Filtros por categoria
- Botão "Adicionar Produto"
- Modal de criação/edição

**Campos do Form:**
- Nome, SKU, EAN
- Categoria (select)
- Preço, Estoque
- Localização (Corredor - Prateleira)
- Descrição, Specs (JSON)
- Upload de Imagem

**API:**
```
GET /api/admin/products (lista)
POST /api/admin/products (criar)
PUT /api/admin/products/[id] (editar)
DELETE /api/admin/products/[id] (deletar)
```

---

### **Pedidos** (`/admin/orders`)
**Features:**
- Tabela com status (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)
- Filtros por status
- Ação: "Atualizar Status"
- View detalhes (modal)

---

### **Separação (Picking)** (`/admin/picking`)
**Arquivo:** `src/app/admin/picking/page.tsx`

**Funcionalidade:**
> Otimizar rota do estoquista agrupando itens por `stock_location`

**Query:**
```sql
SELECT p.name, p.sku, p.stock_location, SUM(oi.quantity) as total
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'PENDING'
GROUP BY p.id
ORDER BY p.stock_location ASC
```

**UI:**
- Tabela ordenada alfabeticamente por localização
- Colunas: Localização, SKU, Nome, Qtd Total
- Checkbox para marcar como separado

---

### **Financeiro (OWNER Only)** (`/admin/financial`)
**Arquivo:** `src/app/admin/financial/page.tsx`

**Tabs:**

**1. Configuração de Juros:**
```tsx
Form:
- Taxa de Juros Mensal (%)
- Máximo de Parcelas
- Parcela Mínima (R$)

Botão: "Salvar Configuração"
```

**API:**
```
GET /api/admin/financial/config
PUT /api/admin/financial/config (OWNER only)
```

**2. Relatórios:**
- Faturamento Total
- Pedidos por Mês (gráfico)
- Produtos Mais Vendidos

---

## 🎨 Componentes UI (Shadcn/UI)

### **Criados:**
1. **Button** (`src/components/ui/button.tsx`)
   - Variants: `default`, `outline`, `ghost`
   - Sizes: `sm`, `default`, `lg`

2. **Input** (`src/components/ui/input.tsx`)
   - Style: border com focus ring
   - Suporte a tipos (email, password, tel)

3. **Label** (`src/components/ui/label.tsx`)
   - Radix UI Label com styling

4. **Slider** (`src/components/ui/slider.tsx`)
   - Range Slider (2 thumbs)
   - Usado em filtro de preço

5. **ProductCard** (`src/components/product-card.tsx`)
   - Imagem, Nome, Preço, Categoria
   - Hover: lift effect (translateY)
   - Botão "Ver Detalhes"

6. **SkeletonCard** (`src/components/skeleton-card.tsx`)
   - Loading state para produtos
   - Animação pulse

---

## 🔄 Fluxos de Navegação

### **Fluxo de Compra:**
```
1. Homepage → Ver Produtos
2. PLP (Listagem) → Aplicar Filtros → Clicar em Produto
3. PDP (Detalhe) → Selecionar Voltagem → Adicionar ao Carrinho
4. Carrinho (Drawer) → Revisar Itens → Continuar para Checkout
5. Checkout → Preencher Endereço → Selecionar Pagamento → Finalizar
6. Confirmação → Redirecionamento para "Meus Pedidos"
```

### **Fluxo de Registro:**
```
1. Header → Botão "Entrar" → /auth/login
2. Link "Cadastre-se" → /auth/register
3. Preencher Form → Submit
4. API cria User com role=CUSTOMER
5. Redirect → /auth/login (com toast de sucesso)
6. Login → Redirect → Homepage (autenticado)
```

### **Fluxo Admin:**
```
1. Login com role=ADMIN ou OWNER
2. Header mostra botão "Admin"
3. Clique → /admin/dashboard
4. Sidebar persistente em todas as rotas /admin/*
5. OWNER vê aba "Financeiro"
6. ADMIN não vê "Financeiro" (middleware bloqueia)
```

---

## 📱 Responsividade

### **Breakpoints (Tailwind):**
```
sm: 640px   → Mobile (landscape)
md: 768px   → Tablet
lg: 1024px  → Desktop
xl: 1280px  → Large Desktop
```

### **Adaptações:**

**Homepage:**
- Hero: 2 colunas → 1 coluna (mobile)
- Categories: 4 colunas → 2 colunas (tablet) → 2 colunas (mobile)
- Featured: 4 → 2 → 1

**PLP:**
- Filtros: Sidebar fixa → Modal overlay
- Grid: 3 → 2 → 1

**Admin:**
- Sidebar: Fixa → Hamburger menu
- Stats: 4 → 2 → 1

---

## 🎯 Animações (Framer Motion)

### **Padrões Utilizados:**

**1. Fade In + Slide Up:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
```

**2. Stagger Children:**
```tsx
products.map((product, index) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
))
```

**3. Hover Lift Effect:**
```css
.lift-effect:hover {
  transform: translateY(-4px);
  transition: transform 0.3s ease;
}
```

**4. Pulse Loading:**
```tsx
<div className="animate-pulse bg-metallic-200" />
```

---

## 🔔 Notificações (Sonner)

### **Padrões:**

**Sucesso:**
```tsx
toast.success('Produto adicionado ao carrinho!');
```

**Erro:**
```tsx
toast.error('Erro ao carregar produtos');
```

**Info:**
```tsx
toast.info('Estoque atualizado com sucesso');
```

**Promise:**
```tsx
toast.promise(
  fetchData(),
  {
    loading: 'Carregando...',
    success: 'Dados carregados!',
    error: 'Erro ao carregar',
  }
);
```

---

## 🚀 Performance

### **Otimizações Implementadas:**

1. **Server Components:**
   - Fetch de dados no servidor
   - Menor bundle JavaScript

2. **Image Optimization:**
   - Next.js `<Image>` (lazy load automático)
   - WebP conversion

3. **Code Splitting:**
   - Dynamic imports para modais
   - Route-based splitting (App Router)

4. **Debounce:**
   - Busca com delay de 300ms
   - Filtros com debounce

5. **Memoization:**
   - `useMemo` para cálculos de preço
   - `useCallback` para event handlers

---

## 📊 Analytics & Tracking

### **Eventos para Rastrear:**

**E-commerce:**
- `product_view` (PDP)
- `add_to_cart` (PDP, PLP)
- `begin_checkout` (Carrinho)
- `purchase` (Confirmação)

**Navegação:**
- `page_view` (todas as rotas)
- `search` (campo de busca)
- `filter_apply` (PLP)

**Configuração (Google Analytics 4):**
```tsx
// src/lib/analytics.ts
export const trackEvent = (eventName: string, params?: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};
```

---

## 🎨 Acessibilidade (a11y)

### **Implementações:**

1. **Semantic HTML:**
   - `<nav>`, `<main>`, `<aside>`, `<footer>`

2. **ARIA Labels:**
   ```tsx
   <button aria-label="Adicionar ao carrinho">
     <ShoppingCart />
   </button>
   ```

3. **Keyboard Navigation:**
   - Tab order lógico
   - Focus visível (ring-2)

4. **Contraste de Cores:**
   - WCAG AA compliance (4.5:1 text)
   - Botões com contraste alto

5. **Screen Readers:**
   - Alt text em imagens
   - Labels em inputs

---

## 🔧 Customização de Tema

### **Tailwind Config:**
```javascript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {
        50: '#EFF6FF',
        ...
        900: '#1E3A8A',
      },
      metallic: {
        50: '#F9FAFB',
        ...
        900: '#111827',
      },
    },
  },
}
```

**Uso:**
```tsx
<div className="bg-primary-600 text-white hover:bg-primary-700">
```

---

## 📦 Estrutura de Componentes

```
src/components/
├── ui/                  # Shadcn components
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   └── slider.tsx
├── header.tsx           # Navbar global
├── footer.tsx           # Footer global
├── hero-section.tsx     # Homepage hero
├── categories-grid.tsx  # Homepage categorias
├── featured-products.tsx # Homepage destaques
├── product-card.tsx     # Card de produto
└── skeleton-card.tsx    # Loading state
```

---

## 🌐 SEO

### **Metadata (Next.js 14):**

```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
  title: 'Shopping das Ferramentas - Loja Profissional',
  description: 'As melhores ferramentas profissionais: Makita, Bosch, DeWalt. Frete Grátis e Parcele sem Juros.',
  keywords: ['ferramentas', 'makita', 'bosch', 'dewalt', 'profissional'],
  openGraph: {
    title: 'Shopping das Ferramentas',
    description: 'As melhores ferramentas profissionais',
    images: ['/og-image.jpg'],
  },
};
```

**Dynamic Metadata (PDP):**
```tsx
// src/app/produtos/[id]/page.tsx
export async function generateMetadata({ params }) {
  const product = await fetchProduct(params.id);
  return {
    title: `${product.name} | Shopping das Ferramentas`,
    description: product.description,
  };
}
```

---

## ✅ Checklist de Implementação

### **✅ Concluído:**
- [x] Homepage completa (Hero, Categorias, Destaques)
- [x] Sistema de autenticação (Login, Registro)
- [x] Página de listagem de produtos (PLP)
- [x] Página de detalhes do produto (PDP)
- [x] Área do usuário (Perfil, Pedidos, Endereços)
- [x] Painel admin moderno com sidebar
- [x] Dashboard com estatísticas em tempo real
- [x] Componentes UI (Button, Input, Label, Slider)
- [x] Responsividade mobile-first
- [x] Animações com Framer Motion

### **🚧 Próximos Passos:**
- [ ] Carrinho lateral (Drawer)
- [ ] Checkout completo
- [ ] Integração de pagamento (Stripe/Mercado Pago)
- [ ] Sistema de avaliações (5 estrelas)
- [ ] Wishlist (Favoritos)
- [ ] Notificações push
- [ ] Chat com assistente virtual (Vercel AI SDK)

---

**Última Atualização:** Dezembro 2024  
**Autor:** Time de Desenvolvimento - Shopping das Ferramentas
