# 🎨 UX/UI DESIGN GUIDE - Shopping das Ferramentas

## 📐 Design System Completo

### 🎨 Paleta de Cores

#### **Cores Primárias**
```css
/* Primary Blue (CTAs, Links) */
--primary-50:  #EFF6FF;
--primary-100: #DBEAFE;
--primary-200: #BFDBFE;
--primary-300: #93C5FD;
--primary-400: #60A5FA;
--primary-500: #3B82F6;
--primary-600: #2563EB; /* Main */
--primary-700: #1D4ED8;
--primary-800: #1E40AF;
--primary-900: #1E3A8A;

/* Metallic Gray (Backgrounds, Text) */
--metallic-50:  #F9FAFB;
--metallic-100: #F3F4F6;
--metallic-200: #E5E7EB;
--metallic-300: #D1D5DB;
--metallic-400: #9CA3AF;
--metallic-500: #6B7280;
--metallic-600: #4B5563;
--metallic-700: #374151;
--metallic-800: #1F2937;
--metallic-900: #111827; /* Main */
```

#### **Cores Semânticas**
```css
/* Success */
--success: #10B981;
--success-bg: #D1FAE5;

/* Warning */
--warning: #F59E0B;
--warning-bg: #FEF3C7;

/* Error */
--error: #EF4444;
--error-bg: #FEE2E2;

/* Info */
--info: #3B82F6;
--info-bg: #DBEAFE;
```

---

### ✍️ Tipografia

#### **Font Stack**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

#### **Escala de Tamanhos**
```css
/* Headings */
.text-xs:   12px / 16px (0.75rem)
.text-sm:   14px / 20px (0.875rem)
.text-base: 16px / 24px (1rem)
.text-lg:   18px / 28px (1.125rem)
.text-xl:   20px / 28px (1.25rem)
.text-2xl:  24px / 32px (1.5rem)
.text-3xl:  30px / 36px (1.875rem)
.text-4xl:  36px / 40px (2.25rem)
.text-5xl:  48px / 1 (3rem)
.text-6xl:  60px / 1 (3.75rem)

/* Font Weights */
.font-normal:    400
.font-medium:    500
.font-semibold:  600
.font-bold:      700
.font-extrabold: 800
```

#### **Hierarquia de Uso**
```tsx
// Page Title (H1)
<h1 className="text-4xl lg:text-5xl font-bold text-metallic-900">

// Section Title (H2)
<h2 className="text-2xl lg:text-3xl font-bold text-metallic-900">

// Card Title (H3)
<h3 className="text-lg font-semibold text-metallic-900">

// Body Text
<p className="text-base text-metallic-700">

// Small Text
<p className="text-sm text-metallic-600">

// Caption
<p className="text-xs text-metallic-500">
```

---

### 📏 Espaçamento

#### **Sistema de 4px**
```css
/* Padding/Margin Scale */
0:   0px
1:   4px   (0.25rem)
2:   8px   (0.5rem)
3:   12px  (0.75rem)
4:   16px  (1rem)
5:   20px  (1.25rem)
6:   24px  (1.5rem)
8:   32px  (2rem)
10:  40px  (2.5rem)
12:  48px  (3rem)
16:  64px  (4rem)
20:  80px  (5rem)
24:  96px  (6rem)
```

#### **Uso Recomendado**
```tsx
// Card Padding
<div className="p-6"> // 24px

// Section Spacing
<section className="py-16"> // 64px vertical

// Button Padding
<button className="px-6 py-3"> // 24px horizontal, 12px vertical

// Grid Gap
<div className="grid gap-6"> // 24px entre itens
```

---

### 🎭 Componentes de UI

#### **1. Botões**

**Variants:**
```tsx
// Primary (CTA)
<Button className="bg-primary-600 text-white hover:bg-primary-700">
  Adicionar ao Carrinho
</Button>

// Outline
<Button variant="outline" className="border-2 border-primary-600 text-primary-600">
  Ver Detalhes
</Button>

// Ghost
<Button variant="ghost" className="text-metallic-700 hover:bg-metallic-100">
  Cancelar
</Button>

// Destructive
<Button className="bg-red-600 text-white hover:bg-red-700">
  Excluir
</Button>
```

**Sizes:**
```tsx
// Small
<Button size="sm" className="h-10 px-4 text-sm">

// Default
<Button className="h-12 px-6 text-base">

// Large
<Button size="lg" className="h-14 px-8 text-lg">
```

**States:**
```css
/* Disabled */
.disabled:opacity-50
.disabled:cursor-not-allowed

/* Loading */
.loading::before {
  content: "";
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.6s linear infinite;
}
```

---

#### **2. Cards de Produto**

**Anatomia:**
```tsx
<div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden">
  {/* Image Container */}
  <div className="aspect-square bg-metallic-100 relative group">
    <img src="..." className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
    
    {/* Badge de Oferta */}
    <span className="absolute top-3 right-3 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
      -30%
    </span>
  </div>

  {/* Content */}
  <div className="p-6 space-y-3">
    {/* Category */}
    <p className="text-xs text-primary-600 font-semibold uppercase tracking-wide">
      Ferramentas Elétricas
    </p>

    {/* Title */}
    <h3 className="text-lg font-semibold text-metallic-900 line-clamp-2">
      Parafusadeira Makita DHP453Z 18V
    </h3>

    {/* Price */}
    <div>
      <p className="text-sm text-metallic-500 line-through">
        De R$ 899,00
      </p>
      <p className="text-2xl font-bold text-primary-600">
        R$ 629,00
      </p>
      <p className="text-xs text-metallic-600">
        ou 12x de R$ 52,42
      </p>
    </div>

    {/* CTA */}
    <Button className="w-full">
      Ver Detalhes
    </Button>
  </div>
</div>
```

**Hover Effects:**
```css
/* Lift Effect */
.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

/* Image Zoom */
.card:hover img {
  transform: scale(1.05);
}
```

---

#### **3. Inputs**

**Standard Input:**
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="seu@email.com"
    className="h-12 border-metallic-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20"
  />
</div>
```

**Input com Ícone:**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-3.5 h-5 w-5 text-metallic-400" />
  <Input
    placeholder="Buscar produtos..."
    className="pl-10"
  />
</div>
```

**Input de Quantidade:**
```tsx
<div className="flex items-center gap-3">
  <button className="h-12 w-12 border-2 border-metallic-300 rounded-lg hover:bg-metallic-100">
    -
  </button>
  <span className="h-12 px-6 border-2 border-metallic-300 rounded-lg font-bold flex items-center justify-center">
    1
  </span>
  <button className="h-12 w-12 border-2 border-metallic-300 rounded-lg hover:bg-metallic-100">
    +
  </button>
</div>
```

---

#### **4. Badges & Tags**

**Status Badges:**
```tsx
// Success
<span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
  CONFIRMADO
</span>

// Warning
<span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
  PENDENTE
</span>

// Error
<span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
  CANCELADO
</span>

// Info
<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
  EM TRÂNSITO
</span>
```

**Category Tags:**
```tsx
<span className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
  Promoção
</span>
```

---

### 🖼️ Layouts

#### **Container Responsivo**
```tsx
<div className="container mx-auto px-4">
  {/* max-width: 1280px no xl */}
</div>
```

#### **Grid de Produtos**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {products.map(product => <ProductCard {...product} />)}
</div>
```

#### **Sidebar + Content**
```tsx
<div className="grid lg:grid-cols-4 gap-6">
  {/* Sidebar */}
  <aside className="lg:col-span-1">
    <div className="sticky top-24">
      {/* Filters */}
    </div>
  </aside>

  {/* Main Content */}
  <main className="lg:col-span-3">
    {/* Products Grid */}
  </main>
</div>
```

---

### 🎞️ Animações (Framer Motion)

#### **Fade In + Slide Up**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
```

#### **Stagger Children**
```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
>
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    />
  ))}
</motion.div>
```

#### **Hover Scale**
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
```

#### **Modal Enter/Exit**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
```

---

### 📱 Responsividade

#### **Breakpoints Mobile-First**
```tsx
// Mobile (default)
<div className="text-2xl">

// Tablet (768px+)
<div className="text-2xl md:text-3xl">

// Desktop (1024px+)
<div className="text-2xl md:text-3xl lg:text-4xl">

// Large Desktop (1280px+)
<div className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
```

#### **Grid Responsivo**
```tsx
// 1 col mobile → 2 col tablet → 3 col desktop → 4 col large
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

#### **Ocultar/Mostrar por Breakpoint**
```tsx
// Apenas Desktop
<div className="hidden lg:block">

// Apenas Mobile
<div className="lg:hidden">

// Mostrar em Tablet e Desktop
<div className="hidden md:block">
```

---

### 🎯 Estados de UI

#### **Loading State (Skeleton)**
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-64 bg-metallic-200 rounded-2xl" />
  <div className="space-y-2">
    <div className="h-4 bg-metallic-200 rounded w-3/4" />
    <div className="h-4 bg-metallic-200 rounded w-1/2" />
  </div>
</div>
```

#### **Empty State**
```tsx
<div className="text-center py-12">
  <Package className="h-16 w-16 text-metallic-300 mx-auto mb-4" />
  <h3 className="text-xl font-semibold text-metallic-900 mb-2">
    Nenhum produto encontrado
  </h3>
  <p className="text-metallic-600 mb-6">
    Tente ajustar os filtros ou buscar por outros termos
  </p>
  <Button>Limpar Filtros</Button>
</div>
```

#### **Error State**
```tsx
<div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg">
  <div className="flex items-start gap-3">
    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
    <div>
      <h3 className="font-semibold text-red-900 mb-1">
        Erro ao carregar produtos
      </h3>
      <p className="text-sm text-red-700">
        Não foi possível carregar os produtos. Tente novamente.
      </p>
    </div>
  </div>
</div>
```

---

### 🔔 Toast Notifications (Sonner)

**Configuração Global:**
```tsx
// src/app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
        />
      </body>
    </html>
  );
}
```

**Tipos de Toast:**
```tsx
import { toast } from 'sonner';

// Success
toast.success('Produto adicionado ao carrinho!');

// Error
toast.error('Erro ao processar pagamento');

// Warning
toast.warning('Estoque limitado');

// Info
toast.info('Novo pedido recebido');

// Custom
toast.custom((t) => (
  <div className="bg-white shadow-lg rounded-lg p-4">
    <h3 className="font-bold">Título Custom</h3>
    <p>Mensagem personalizada</p>
  </div>
));
```

---

### 🎨 Gradientes

**Background Gradientes:**
```css
/* Hero Section */
.bg-gradient-to-br from-metallic-900 via-metallic-800 to-primary-900

/* Card Accent */
.bg-gradient-to-r from-primary-500 to-primary-600

/* Overlay */
.bg-gradient-to-t from-black/60 to-transparent
```

**Text Gradientes:**
```tsx
<h1 className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
  Texto com Gradiente
</h1>
```

---

### 🖱️ Interações

#### **Hover States**
```css
/* Button */
.hover:bg-primary-700
.hover:shadow-lg
.hover:scale-105

/* Link */
.hover:text-primary-600
.hover:underline

/* Card */
.hover:shadow-2xl
.hover:translate-y-[-8px]
```

#### **Active States**
```css
/* Button Press */
.active:scale-95

/* Input Focus */
.focus:outline-none
.focus:ring-2
.focus:ring-primary-500
.focus:border-primary-600
```

#### **Disabled States**
```css
.disabled:opacity-50
.disabled:cursor-not-allowed
.disabled:pointer-events-none
```

---

### ♿ Acessibilidade

#### **Focus Visível**
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg">
  Botão Acessível
</button>
```

#### **Skip to Content**
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-lg z-50"
>
  Pular para o conteúdo
</a>
```

#### **ARIA Labels**
```tsx
<button aria-label="Adicionar ao carrinho">
  <ShoppingCart className="h-5 w-5" />
</button>

<input
  type="search"
  aria-label="Buscar produtos"
  placeholder="Buscar..."
/>
```

---

### 📐 Proporções & Aspect Ratios

**Product Images:**
```tsx
// Square (1:1)
<div className="aspect-square">

// 4:3 (Landscape)
<div className="aspect-4/3">

// 16:9 (Widescreen)
<div className="aspect-video">
```

**Avatar Sizes:**
```tsx
// Small
<img className="h-8 w-8 rounded-full" />

// Medium
<img className="h-12 w-12 rounded-full" />

// Large
<img className="h-16 w-16 rounded-full" />
```

---

### 🎬 Transições

**Timing Functions:**
```css
/* Ease Out (Natural) */
.transition-all duration-300 ease-out

/* Ease In Out (Smooth) */
.transition-all duration-500 ease-in-out

/* Spring (Bouncy) */
.transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]
```

**Propriedades:**
```tsx
// All Properties
<div className="transition-all">

// Transform Only
<div className="transition-transform">

// Colors Only
<div className="transition-colors">

// Shadow Only
<div className="transition-shadow">
```

---

### 🌈 Opacidade & Blur

**Background Blur (Glassmorphism):**
```tsx
<div className="backdrop-blur-md bg-white/80">
  Conteúdo com efeito de vidro
</div>
```

**Opacity Hover:**
```tsx
<img className="opacity-100 hover:opacity-80 transition-opacity" />
```

---

### 🎨 Guia de Uso por Página

#### **Homepage:**
- Hero: Gradiente escuro + CTA destacado
- Categorias: Cards coloridos com hover lift
- Produtos: Grid com spacing generoso

#### **PLP (Listagem):**
- Sidebar clara com borders sutis
- Grid responsivo com gap consistente
- Filtros com checkboxes estilizados

#### **PDP (Detalhe):**
- Imagem grande (aspect-square)
- Buy Box destacado com shadow
- Preço em destaque (text-4xl, primary-600)

#### **Admin:**
- Sidebar escura (metallic-900)
- Cards brancos com shadow-lg
- Stats com gradiente no topo

---

**Última Atualização:** Dezembro 2024  
**Design System Version:** 1.0.0
