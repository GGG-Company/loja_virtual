# 🗺️ Mapa Completo de Páginas - Shopping das Ferramentas

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}

---

## 📌 Índice Geral

1. [Páginas Públicas](#-páginas-públicas)
2. [Páginas de Autenticação](#-páginas-de-autenticação)
3. [Área do Cliente](#-área-do-cliente)
4. [Painel Administrativo](#-painel-administrativo)
5. [Páginas Institucionais](#-páginas-institucionais)
6. [Resumo Visual](#-resumo-visual)

---

## 🌐 Páginas Públicas

### Homepage `/`
- **Arquivo:** `src/app/page.tsx`
- **Descrição:** Página inicial do e-commerce
- **Componentes:**
  - `HeroSection` - Banner principal com CTAs
  - `CategoriesGrid` - Grid de categorias com ícones animados
  - `FeaturedProducts` - Produtos em destaque
  - `Header` e `Footer`
- **Animações:** Fade-in, Slide-up, Stagger (Framer Motion)
- **Funcionalidades:**
  - Apresentação da marca
  - Destaques de produtos
  - Navegação rápida por categorias
  - Links para principais seções

---

### Produtos `/produtos`
- **Arquivo:** `src/app/produtos/page.tsx`
- **Descrição:** Listagem de produtos com filtros avançados
- **Componentes:**
  - Sidebar de filtros (Slider de preço, Marcas, Voltagem)
  - Grid de produtos com `ProductCard`
  - Skeleton loader
- **Animações:** Fade-in cards, Hover lift effect
- **Funcionalidades:**
  - Filtro por preço (Slider)
  - Filtro por marca (Checkboxes)
  - Filtro por voltagem (110V/220V/Bivolt)
  - Ordenação (Menor preço, Maior preço, Mais vendidos, Lançamentos)
  - Busca por query params
  - Paginação (futuro)
- **APIs:**
  - `GET /api/products` - Lista produtos com filtros

---

### Detalhe do Produto `/produtos/[id]`
- **Arquivo:** `src/app/produtos/[id]/page.tsx`
- **Descrição:** Página de detalhes do produto (PDP)
- **Componentes:**
  - Galeria de imagens
  - Buy Box com seletor de voltagem
  - Seletor de quantidade
  - Botão "Adicionar ao Carrinho"
  - Abas de Descrição e Especificações
- **Animações:** Fade-in, Image zoom on hover
- **Funcionalidades:**
  - Seleção de variantes (voltagem)
  - Cálculo de parcelamento
  - Toast de confirmação ao adicionar no carrinho
  - SEO otimizado (meta tags dinâmicas)
- **APIs:**
  - `GET /api/products/[id]` - Detalhes do produto

---

### Carrinho `/carrinho`
- **Arquivo:** `src/app/carrinho/page.tsx`
- **Descrição:** Página do carrinho de compras
- **Componentes:**
  - Stepper de checkout (5 etapas)
  - Cards de produtos no carrinho
  - Resumo de valores
  - Estado vazio animado
- **Animações:** Bounce icon, Stagger items, Scale on hover
- **Funcionalidades:**
  - Visualização de itens no carrinho
  - Atualização de quantidade
  - Remoção de itens
  - Cálculo de frete
  - Sugestões de categorias (estado vazio)
- **Status:** Frontend completo (backend de carrinho pendente)

---

### Ofertas `/ofertas`
- **Arquivo:** `src/app/ofertas/page.tsx`
- **Descrição:** Página de promoções e ofertas especiais
- **Componentes:**
  - Hero com gradiente animado
  - Cards de produtos em promoção
  - Badges de desconto
- **Animações:** Hero background animation, Card hover effects, Badge slide-in
- **Funcionalidades:**
  - Exibição de produtos com desconto
  - Cálculo de economia
  - Badges personalizadas (DESTAQUE, OFERTA, PROMOÇÃO)
  - Timer de contagem regressiva (futuro)
- **Status:** Frontend completo

---

## 🔐 Páginas de Autenticação

### Login `/auth/login`
- **Arquivo:** `src/app/auth/login/page.tsx`
- **Descrição:** Página de login com múltiplos métodos
- **Métodos de Autenticação:**
  1. **Google OAuth** - Botão "Continuar com Google"
  2. **Credenciais** - Email + Senha
- **Animações:** Fade-in form, Button pulse effect
- **Funcionalidades:**
  - Login com Google (NextAuth)
  - Login com email/senha
  - Validação de formulário (React Hook Form + Zod)
  - Redirecionamento pós-login
  - Card com credenciais de teste visível
  - Link para página de registro
- **Credenciais de Teste:**
  - Email: `teste@email.com`
  - Senha: `123456`
- **APIs:**
  - NextAuth SignIn

---

### Registro `/auth/register`
- **Arquivo:** `src/app/auth/register/page.tsx`
- **Descrição:** Página de cadastro de novo usuário
- **Animações:** Fade-in, Field focus effects
- **Funcionalidades:**
  - Cadastro com nome, email, telefone, senha
  - Validação de senha (confirmação)
  - Validação de formato de email
  - Hash de senha no backend (bcrypt)
  - Toast de sucesso/erro
  - Redirecionamento automático para login
- **APIs:**
  - `POST /api/auth/register` - Cria novo usuário

---

## 👤 Área do Cliente

### Minha Conta `/minha-conta`
- **Arquivo:** `src/app/minha-conta/page.tsx`
- **Descrição:** Dashboard do usuário com 3 abas
- **Componentes:**
  - Tabs: Perfil, Pedidos, Endereços
  - Cards animados
  - Formulários editáveis
- **Animações:** Tab transitions, Card slide-in
- **Funcionalidades:**

#### Aba "Perfil"
- Exibição de dados do usuário (nome, email, telefone)
- Edição de informações pessoais
- Upload de foto de perfil (futuro)

#### Aba "Pedidos"
- Listagem de pedidos do usuário
- Cards com status (Pendente, Pago, Enviado, Entregue, Cancelado)
- Detalhes de cada pedido (itens, valores, data)
- Rastreamento de pedidos

#### Aba "Endereços"
- Gerenciamento de endereços de entrega
- Adicionar novo endereço
- Editar/excluir endereços existentes
- Marcar endereço como principal

- **Proteção:** Rota protegida (requer autenticação)
- **APIs:**
  - `GET /api/user/orders` - Lista pedidos do usuário

---

## 🛠️ Painel Administrativo

### Admin Layout `/admin/*`
- **Arquivo:** `src/app/admin/layout.tsx`
- **Descrição:** Layout wrapper para todas as páginas admin
- **Componentes:**
  - Sidebar com navegação
  - Header com perfil do admin
  - Menu responsivo (hamburger)
- **Animações:** Sidebar slide-in, Menu item hover
- **Funcionalidades:**
  - Navegação entre seções do admin
  - Logout
  - RBAC (Role-Based Access Control) - apenas admins
  - Menu items: Dashboard, Produtos, Pedidos, Clientes, Categorias, Configurações
- **Proteção:** Rota protegida (requer role ADMIN)

---

### Dashboard Admin `/admin/dashboard`
- **Arquivo:** `src/app/admin/dashboard/page.tsx`
- **Descrição:** Painel principal com estatísticas e KPIs
- **Componentes:**
  - 4 Cards de estatísticas
  - Gráfico de vendas (futuro)
  - Tabela de pedidos recentes
  - Alertas de estoque baixo
- **Animações:** Stagger cards, Number count-up effect
- **Funcionalidades:**
  - Exibição de métricas em tempo real:
    - Total de Vendas (R$)
    - Total de Pedidos (#)
    - Total de Clientes (#)
    - Taxa de Conversão (%)
  - Listagem de pedidos recentes
  - Alertas de produtos com estoque baixo
  - Links rápidos para ações
- **APIs:**
  - `GET /api/admin/stats` - Estatísticas do dashboard

---

### Produtos Admin `/admin/produtos` *(Existente - não modificado nesta sessão)*
- **Funcionalidades:**
  - CRUD completo de produtos
  - Upload de imagens
  - Gerenciamento de variantes
  - Controle de estoque

---

### Pedidos Admin `/admin/pedidos` *(Existente - não modificado nesta sessão)*
- **Funcionalidades:**
  - Listagem de todos os pedidos
  - Atualização de status
  - Detalhes de pedidos
  - Filtros e busca

---

## 📄 Páginas Institucionais

### Sobre Nós `/sobre`
- **Arquivo:** `src/app/sobre/page.tsx`
- **Descrição:** Página institucional sobre a empresa
- **Componentes:**
  - Hero com gradiente
  - Cards de estatísticas (15+ anos, 50k+ clientes, 5k+ produtos, 98% satisfação)
  - Seção "Nossa História"
  - Seção "Nossos Valores" (4 cards)
- **Animações:** Hero pattern animation, Stats counter, Values cards rotation
- **Funcionalidades:**
  - Apresentação da empresa
  - Timeline da história (futuro)
  - Valores e missão
  - Estatísticas impressionantes
  - Certificações e prêmios (futuro)

---

### Contato `/contato`
- **Arquivo:** `src/app/contato/page.tsx`
- **Descrição:** Página de contato com formulário
- **Componentes:**
  - Hero
  - Cards de informações de contato (Telefone, Email, Endereço, Horário)
  - Formulário de contato
- **Animações:** Cards slide-in, Form field focus
- **Funcionalidades:**
  - Formulário de contato (Nome, Email, Telefone, Assunto, Mensagem)
  - Validação de campos
  - Envio de email (futuro backend)
  - Mapa de localização (futuro)
  - Chat online (futuro)
- **Contatos:**
  - Telefone: (71) 3333-4444
  - Email: contato@shopferramentas.com.br
  - Endereço: Av. Principal, 1234 - Salvador, BA

---

### Política de Privacidade `/privacidade`
- **Arquivo:** `src/app/privacidade/page.tsx`
- **Descrição:** Política de privacidade e proteção de dados (LGPD)
- **Componentes:**
  - Hero institucional
  - Seções organizadas (6 seções)
  - Accordions (futuro)
- **Animações:** Section fade-in on scroll
- **Funcionalidades:**
  - Informações sobre coleta de dados
  - Uso de informações
  - Compartilhamento de dados
  - Direitos do usuário (LGPD)
  - Uso de cookies
  - Segurança dos dados
  - Contato para questões de privacidade
- **Conformidade:** LGPD, GDPR

---

## 📊 Resumo Visual

### Total de Páginas: **13 páginas**

```
┌─────────────────────────────────────────────────────────┐
│                  PÁGINAS PÚBLICAS (5)                   │
├─────────────────────────────────────────────────────────┤
│ ✓ Homepage                         /                    │
│ ✓ Produtos (Listagem)             /produtos             │
│ ✓ Produto (Detalhe)               /produtos/[id]        │
│ ✓ Carrinho                        /carrinho             │
│ ✓ Ofertas                         /ofertas              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              AUTENTICAÇÃO (2)                           │
├─────────────────────────────────────────────────────────┤
│ ✓ Login                           /auth/login           │
│ ✓ Registro                        /auth/register        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              ÁREA DO CLIENTE (1)                        │
├─────────────────────────────────────────────────────────┤
│ ✓ Minha Conta (3 abas)            /minha-conta          │
│   - Perfil                                              │
│   - Pedidos                                             │
│   - Endereços                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           PAINEL ADMINISTRATIVO (2)                     │
├─────────────────────────────────────────────────────────┤
│ ✓ Dashboard Admin                 /admin/dashboard      │
│ ✓ Layout Admin                    /admin/layout         │
│ • Produtos Admin                  /admin/produtos       │
│ • Pedidos Admin                   /admin/pedidos        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           PÁGINAS INSTITUCIONAIS (3)                    │
├─────────────────────────────────────────────────────────┤
│ ✓ Sobre Nós                       /sobre               │
│ ✓ Contato                         /contato             │
│ ✓ Política de Privacidade         /privacidade         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Tecnologias Utilizadas

- **Framework:** Next.js 14 (App Router)
- **UI Library:** Shadcn/UI + Radix UI
- **Animações:** Framer Motion
- **Autenticação:** NextAuth v5 (Google OAuth + Credentials)
- **Formulários:** React Hook Form + Zod
- **Notificações:** Sonner (Toast)
- **Ícones:** Lucide React
- **Styling:** Tailwind CSS

---

## 🚀 Próximos Passos

### Páginas Pendentes (Opcionais)
- [ ] FAQ `/faq`
- [ ] Blog `/blog`
- [ ] Blog Post `/blog/[slug]`
- [ ] Termos de Uso `/termos`
- [ ] Política de Troca `/trocas`
- [ ] Rastreamento de Pedido `/rastreamento`
- [ ] Checkout `/checkout`
- [ ] Confirmação de Pedido `/pedido/[id]`

### Melhorias Futuras
- [ ] SEO otimizado (meta tags dinâmicas)
- [ ] PWA (Progressive Web App)
- [ ] Dark Mode
- [ ] Internacionalização (i18n)
- [ ] Busca avançada com autocomplete
- [ ] Wishlist (Lista de Desejos)
- [ ] Comparação de produtos
- [ ] Avaliações e reviews
- [ ] Chat online (Zendesk/Intercom)
- [ ] Programa de fidelidade

---

## 📝 Notas

✅ Todas as páginas incluem animações Framer Motion  
✅ Design responsivo (mobile-first)  
✅ Padrão de cores consistente (Primary Blue + Metallic Gray)  
✅ Componentes reutilizáveis  
✅ TypeScript strict mode  
✅ Proteção de rotas implementada  
✅ Documentação completa em `/docs`

---

**Desenvolvido com ❤️ para Shopping das Ferramentas**
