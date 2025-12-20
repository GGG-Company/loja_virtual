# 🗺️ MAPA DE ROTAS E PÁGINAS - Shopping das Ferramentas

## 📋 Índice de Rotas

### 🌐 Públicas (Não requer autenticação)
- [Homepage](#homepage)
- [Produtos (Listagem)](#produtos-listagem)
- [Produto (Detalhe)](#produto-detalhe)
- [Login](#login)
- [Registro](#registro)

### 🔐 Protegidas (Requer autenticação CUSTOMER)
- [Minha Conta](#minha-conta)

### 🛡️ Admin (Requer ADMIN ou OWNER)
- [Dashboard](#dashboard-admin)
- [Produtos (Admin)](#produtos-admin)
- [Pedidos (Admin)](#pedidos-admin)
- [Picking](#picking)
- [Configurações](#configurações)

### 👑 Owner (Requer OWNER apenas)
- [Financeiro](#financeiro)

---

## 🌐 ROTAS PÚBLICAS

### Homepage
**Rota:** `/`  
**Arquivo:** `src/app/page.tsx`  
**Componentes:**
- `Header`
- `HeroSection`
- `CategoriesGrid`
- `FeaturedProducts`
- `Footer`

**Descrição:**  
Página inicial da loja virtual com banner hero, categorias visuais e produtos em destaque.

**Features:**
- Hero com gradiente e CTAs
- 4 categorias principais (cards coloridos)
- Grid de produtos marcados como `is_featured`
- Animações Framer Motion
- Responsivo mobile-first

**Links:**
- "Ver Produtos" → `/produtos`
- "Explorar Categorias" → `/produtos?categoria=slug`
- Cards de categoria → `/produtos?categoria={slug}`

---

### Produtos (Listagem)
**Rota:** `/produtos`  
**Arquivo:** `src/app/produtos/page.tsx`  
**Componentes:**
- `Header`
- Sidebar de filtros (Slider, Checkboxes)
- Grid de `ProductCard`
- `SkeletonCard` (loading)
- `Footer`

**Query Params:**
- `?categoria=slug` - Filtrar por categoria
- `?featured=true` - Apenas destaques
- `?limit=N` - Limitar resultados

**Descrição:**  
Página de listagem de produtos (PLP) com filtros avançados e ordenação.

**Features:**
- **Filtros:**
  - Faixa de preço (R$ 0 - R$ 5.000) via Slider
  - Marcas (Makita, Bosch, DeWalt...)
  - Voltagem (110V, 220V, Bivolt, Bateria)
- **Ordenação:**
  - Mais Recentes
  - Menor Preço
  - Maior Preço
  - Nome A-Z
- **Grid Responsivo:** 3 → 2 → 1 colunas
- **Skeleton Loading**

**API Consumida:** `GET /api/products`

---

### Produto (Detalhe)
**Rota:** `/produtos/[id]`  
**Arquivo:** `src/app/produtos/[id]/page.tsx`  
**Componentes:**
- `Header`
- Galeria de imagens
- Buy Box
- Tabs de descrição/specs
- `Footer`

**Descrição:**  
Página de detalhe do produto (PDP) com buy box completo.

**Features:**
- **Galeria:** Imagem principal (aspect-square)
- **Buy Box:**
  - Badge de categoria
  - Título (H1)
  - Rating (5 estrelas)
  - Preço (De/Por)
  - Parcelamento (calculado dinamicamente)
  - Seletor de voltagem (se houver variants)
  - Seletor de quantidade (+/-)
  - Botão "Adicionar ao Carrinho"
  - Botão Favoritar (coração)
- **Badges:** Frete Grátis, Garantia, Parcelamento
- **Descrição:** Texto completo
- **Especificações:** Tabela JSONB (Potência, Peso, etc)

**API Consumida:** `GET /api/products/[id]`

**Hook Usado:** `usePrice(price)` - Cálculo de parcelamento

---

### Login
**Rota:** `/auth/login`  
**Arquivo:** `src/app/auth/login/page.tsx`  
**Componentes:**
- Form de login
- Botão Google OAuth
- Links (Esqueci senha, Cadastre-se)
- Card com credenciais de teste

**Descrição:**  
Página de autenticação com suporte a OAuth Google e credenciais.

**Features:**
- **OAuth Google:** One-click login
- **Email/Senha:** Form validado
- **Credenciais de Teste Visíveis:**
  ```
  👑 Owner: dono@loja.com / senha123
  🛡️ Admin: gerente@loja.com / senha123
  👤 Cliente: cliente@gmail.com / senha123
  ```
- **Links:**
  - "Esqueceu sua senha?" → `/auth/forgot-password`
  - "Cadastre-se" → `/auth/register`

**Design:**
- Gradiente de fundo
- Animação fade in
- Glass morphism no card

**Providers:**
- NextAuth Google OAuth
- NextAuth Credentials (bcrypt)

---

### Registro
**Rota:** `/auth/register`  
**Arquivo:** `src/app/auth/register/page.tsx`  
**Componentes:**
- Form de registro
- Link para login

**Descrição:**  
Página de criação de conta.

**Campos:**
- Nome Completo (required)
- Email (required, validação)
- Telefone (opcional)
- Senha (min 8 chars)
- Confirmar Senha (match validation)

**Validação:** Zod schema  
**API:** `POST /api/auth/register`  
**Segurança:** Bcrypt hash  
**Role Padrão:** CUSTOMER

**Fluxo:**
1. Preencher form
2. Submit
3. API cria usuário
4. Redirect → `/auth/login` (com toast de sucesso)

---

## 🔐 ROTAS PROTEGIDAS (CUSTOMER)

### Minha Conta
**Rota:** `/minha-conta`  
**Arquivo:** `src/app/minha-conta/page.tsx`  
**Componentes:**
- `Header`
- Sidebar com tabs
- Content área
- `Footer`

**Descrição:**  
Dashboard do usuário com gestão de perfil, pedidos e endereços.

**Proteção:** `useSession()` → redirect se não autenticado

**Tabs:**

#### **1. Meu Perfil** (tab=perfil)
- Form com dados pessoais:
  - Nome
  - Email (disabled, read-only)
  - Telefone
  - CPF
- Botão "Salvar Alterações"

#### **2. Meus Pedidos** (tab=pedidos)
**API:** `GET /api/user/orders`

**Se vazio:**
- Ícone Package
- Mensagem "Você ainda não fez nenhum pedido"
- Botão CTA "Começar a Comprar" → `/produtos`

**Se houver pedidos:**
- Cards de pedidos:
  - Pedido #ID (primeiros 8 chars)
  - Data de criação
  - Status (badge colorido: PENDING, CONFIRMED, SHIPPED, etc)
  - Total (R$)

#### **3. Endereços** (tab=enderecos)
**Estado Atual:** Empty state

- Ícone MapPin
- Mensagem "Nenhum endereço cadastrado"
- Botão "Adicionar Endereço" (futuro)

---

## 🛡️ ROTAS ADMIN (ADMIN ou OWNER)

### Layout Admin
**Arquivo:** `src/app/admin/layout.tsx`  
**Descrição:** Layout persistente em todas as rotas `/admin/*`

**Features:**
- **Sidebar Fixa:**
  - Logo "🔨 Admin"
  - User Info Card (nome, email, badge de role)
  - Menu de Navegação
  - Botão Logout
- **Responsivo:** Hamburger menu no mobile
- **Proteção:** 
  - `useSession()` → redirect se não autenticado
  - Bloqueia CUSTOMER de acessar

**Menu:**
- Dashboard 📊
- Produtos 📦
- Pedidos 🛒
- Separação 📋
- Financeiro 💰 (OWNER only)
- Configurações ⚙️

---

### Dashboard (Admin)
**Rota:** `/admin/dashboard`  
**Arquivo:** `src/app/admin/dashboard/page.tsx`  
**API:** `GET /api/admin/stats`

**Descrição:**  
Dashboard administrativo com estatísticas em tempo real.

**Components:**

#### **Stats Cards (Grid 4 colunas):**
1. **Produtos Cadastrados**
   - Ícone: Package (azul)
   - Value: Total de produtos

2. **Pedidos Total**
   - Ícone: ShoppingCart (verde)
   - Value: Total de pedidos

3. **Pedidos Pendentes**
   - Ícone: Clock (amarelo)
   - Value: Pedidos com status PENDING

4. **Faturamento**
   - Ícone: DollarSign (primary)
   - Value: Soma de pedidos CONFIRMED/SHIPPED/DELIVERED

**Features dos Cards:**
- Gradiente superior colorido (2px)
- Badge com ícone (hover scale)
- TrendingUp icon
- Animações Framer Motion

#### **Pedidos Recentes:**
- Últimos 5 pedidos
- Pedido #ID, Data, Status (badge), Total
- Cards clicáveis (hover bg)

#### **Alerta de Estoque Baixo:**
- Produtos com `stock_quantity <= 10`
- Background laranja (`bg-orange-50`)
- Nome, SKU, Quantidade
- Ordenado por quantidade ascendente

**Proteção:** Session + role ADMIN/OWNER

---

### Produtos (Admin)
**Rota:** `/admin/products`  
**Arquivo:** *(Criar próximo)*  
**API:** 
- `GET /api/admin/products` (listar)
- `POST /api/admin/products` (criar)
- `PUT /api/admin/products/[id]` (editar)
- `DELETE /api/admin/products/[id]` (deletar)

**Features:**
- Tabela com paginação
- Filtros por categoria
- Search bar
- Botão "Adicionar Produto"
- Modal de criação/edição
- Upload de imagens
- Gestão de variants (voltagem)

---

### Pedidos (Admin)
**Rota:** `/admin/orders`  
**Arquivo:** *(Criar próximo)*  
**API:** `GET /api/admin/orders`

**Features:**
- Tabela com filtros por status
- Colunas: #ID, Cliente, Data, Status, Total
- Ação: "Atualizar Status"
- Modal de detalhes:
  - Itens do pedido
  - Endereço de entrega
  - Informações de pagamento
  - Tracking code

---

### Picking
**Rota:** `/admin/picking`  
**Arquivo:** *(Criar próximo)*  
**Query:** Otimizada por `stock_location`

**Descrição:**  
Lista de separação de pedidos para otimizar rota do estoquista.

**Query SQL:**
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

**Benefício:** Estoquista percorre depósito de forma eficiente

---

### Configurações
**Rota:** `/admin/settings`  
**Arquivo:** *(Criar próximo)*

**Tabs:**
- Geral (nome da loja, logo, favicon)
- Email (SMTP config)
- Integrações (ML, Hiper, WhatsApp)
- Notificações

---

## 👑 ROTAS OWNER (OWNER APENAS)

### Financeiro
**Rota:** `/admin/financial`  
**Arquivo:** *(Criar próximo)*  
**API:** 
- `GET /api/admin/financial/config`
- `PUT /api/admin/financial/config`

**Descrição:**  
Módulo financeiro exclusivo para o dono da loja.

**Proteção:** 
- Middleware bloqueia ADMIN
- Apenas OWNER acessa

**Tabs:**

#### **1. Configuração de Juros:**
Form com campos:
- Taxa de Juros Mensal (%) - ex: 1.99%
- Máximo de Parcelas - ex: 12
- Parcela Mínima (R$) - ex: 50,00
- Frete Grátis Acima de (R$) - ex: 299,00
- Markup Padrão (%) - ex: 30%

Botão: "Salvar Configuração"

#### **2. Relatórios:**
- Faturamento Total
- Gráfico de pedidos por mês
- Produtos mais vendidos
- Clientes que mais gastaram
- Análise de lucratividade

**Singleton:** Tabela `FinancialConfig` tem apenas 1 registro

---

## 🔌 ROTAS DE API

### Públicas

#### GET /api/products
**Descrição:** Listar produtos  
**Query Params:**
- `?categoria=slug`
- `?featured=true`
- `?limit=N`

**Response:**
```json
{
  "success": true,
  "products": [...]
}
```

---

#### GET /api/products/[id]
**Descrição:** Detalhe do produto  
**Response:**
```json
{
  "success": true,
  "product": {
    "id": "...",
    "name": "...",
    "price": 1899,
    "category": {...},
    "variants": [...]
  }
}
```

---

#### GET /api/financial/config
**Descrição:** Configuração pública de juros  
**Response:**
```json
{
  "creditCardInterestRate": 1.99,
  "maxInstallments": 12,
  "minInstallmentValue": 50
}
```

---

### Autenticadas (Session)

#### POST /api/auth/register
**Headers:** Nenhum  
**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "phone": "(71) 99999-0000"
}
```
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "CUSTOMER"
  }
}
```

---

#### GET /api/user/orders
**Headers:** Cookie (session)  
**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "...",
      "total": 1899,
      "status": "PENDING",
      "created_at": "2025-12-11T10:00:00Z",
      "items": [...]
    }
  ]
}
```

---

#### GET /api/admin/stats
**Headers:** Cookie (session)  
**Proteção:** ADMIN ou OWNER  
**Response:**
```json
{
  "totalProducts": 150,
  "totalOrders": 420,
  "pendingOrders": 12,
  "totalRevenue": 125430.00,
  "recentOrders": [...],
  "lowStockProducts": [...]
}
```

---

#### GET /api/admin/financial/config
**Headers:** Cookie (session)  
**Proteção:** OWNER only  
**Response:**
```json
{
  "creditCardInterestRate": 1.99,
  "maxInstallments": 12,
  "minInstallmentValue": 50,
  "freeShippingMinValue": 299,
  "defaultMarkupPercentage": 30
}
```

---

#### PUT /api/admin/financial/config
**Headers:** Cookie (session)  
**Proteção:** OWNER only  
**Body:**
```json
{
  "creditCardInterestRate": 2.5,
  "maxInstallments": 10
}
```

---

### Integração (X-API-KEY)

#### POST /api/integrations/stock/sync
**Headers:** `X-INTERNAL-API-KEY`  
**Body:**
```json
{
  "sku": "MAKITA-DHR243Z",
  "quantity": 50,
  "source": "MERCADO_LIVRE"
}
```

---

#### POST /api/integrations/orders/update-status
**Headers:** `X-INTERNAL-API-KEY`  
**Body:**
```json
{
  "orderNumber": "ORD-2025-000001",
  "status": "SHIPPED",
  "trackingCode": "BR123456789"
}
```

---

#### GET /api/integrations/marketing/abandoned-carts
**Headers:** `X-INTERNAL-API-KEY`  
**Query Params:** `?hours=24`  
**Response:**
```json
{
  "success": true,
  "count": 3,
  "carts": [...]
}
```

---

## 🗺️ SITEMAP

```
/
├── produtos/
│   └── [id]/
├── auth/
│   ├── login
│   └── register
├── minha-conta/
│   ├── ?tab=perfil
│   ├── ?tab=pedidos
│   └── ?tab=enderecos
└── admin/
    ├── dashboard
    ├── products
    ├── orders
    ├── picking
    ├── settings
    └── financial (OWNER only)
```

---

**Total de Rotas:** 20+  
**Total de APIs:** 12+  
**Última Atualização:** 12 de Dezembro de 2024
