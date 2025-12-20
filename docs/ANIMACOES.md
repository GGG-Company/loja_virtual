# 🎬 Guia de Animações Framer Motion

## 📌 Visão Geral

Todas as páginas do **Shopping das Ferramentas** incluem animações suaves e profissionais usando **Framer Motion**, proporcionando uma experiência de usuário excepcional e moderna.

---

## 🎨 Tipos de Animações Implementadas

### 1. **Fade-in (Entrada com Opacidade)**

Elementos aparecem gradualmente aumentando a opacidade.

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  Conteúdo
</motion.div>
```

**Usado em:**
- Títulos de seção
- Cards de produtos
- Formulários
- Conteúdo principal das páginas

---

### 2. **Slide-up (Deslizamento Vertical)**

Elementos deslizam de baixo para cima.

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Conteúdo
</motion.div>
```

**Usado em:**
- Hero sections
- Títulos principais
- CTAs (Call-to-Actions)
- Estatísticas

---

### 3. **Slide-in (Deslizamento Horizontal)**

Elementos deslizam da direita ou esquerda.

```tsx
<motion.div
  initial={{ opacity: 0, x: -20 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
>
  Conteúdo
</motion.div>
```

**Usado em:**
- Cards de informação
- Badges
- Sidebars
- Formulários de contato

---

### 4. **Scale (Zoom)**

Elementos aumentam de tamanho a partir do centro.

```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 200 }}
>
  Conteúdo
</motion.div>
```

**Usado em:**
- Ícones
- Avatares
- Botões de ação
- Modais

---

### 5. **Stagger (Animação Escalonada)**

Anima listas de elementos com delay progressivo.

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

<motion.div variants={container} initial="hidden" animate="show">
  {items.map((item) => (
    <motion.div key={item.id} variants={item}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

**Usado em:**
- Grid de categorias
- Lista de produtos
- Cards de estatísticas
- Features sections

---

### 6. **Lift Effect (Elevação no Hover)**

Elemento sobe levemente ao passar o mouse.

```tsx
<motion.div
  whileHover={{ y: -8 }}
  transition={{ duration: 0.3 }}
  className="shadow-lg hover:shadow-2xl"
>
  Conteúdo
</motion.div>
```

**Usado em:**
- ProductCard
- CategoryCard
- Admin cards
- Botões importantes

---

### 7. **Rotate (Rotação)**

Elemento rotaciona ao interagir.

```tsx
<motion.div
  whileHover={{ rotate: 360 }}
  transition={{ duration: 0.6 }}
>
  <Icon />
</motion.div>
```

**Usado em:**
- Ícones de categorias
- Ícones de valores (Sobre Nós)
- Loading spinners
- Botões de favorito

---

### 8. **Shine Effect (Brilho Deslizante)**

Efeito de brilho que atravessa o elemento.

```tsx
<motion.div
  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
  initial={{ x: '-100%' }}
  whileHover={{ x: '100%' }}
  transition={{ duration: 0.6 }}
/>
```

**Usado em:**
- Cards de categorias
- Botões CTAs
- Product cards
- Banners

---

### 9. **Bounce (Efeito de Salto)**

Elemento "pula" ao aparecer.

```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ 
    type: 'spring', 
    stiffness: 200,
    damping: 10 
  }}
>
  Conteúdo
</motion.div>
```

**Usado em:**
- Ícone de carrinho vazio
- Notificações
- Modais de confirmação

---

### 10. **Background Animation (Gradiente Animado)**

Background com gradiente animado.

```tsx
<motion.div
  animate={{
    backgroundPosition: ['0% 0%', '100% 100%'],
  }}
  transition={{
    duration: 20,
    repeat: Infinity,
    repeatType: 'reverse',
  }}
  style={{
    backgroundImage: 'radial-gradient(...)',
    backgroundSize: '50px 50px',
  }}
/>
```

**Usado em:**
- Hero sections (Sobre, Ofertas, Privacidade)
- Backgrounds de seções especiais

---

## 📄 Animações por Página

### Homepage `/`

```tsx
// HeroSection
- Fade-in do título (delay 0.2s)
- Slide-up da descrição (delay 0.4s)
- Stagger das badges de features (delay 0.6s)
- Scale dos botões CTAs (delay 0.8s)

// CategoriesGrid
- Stagger dos cards de categoria (0.1s entre cada)
- Rotate 360° dos ícones no hover
- Shine effect nos cards no hover
- Lift effect (y: -8px)

// FeaturedProducts
- Fade-in do título
- Stagger dos ProductCards
- Lift effect nos cards
```

---

### Produtos `/produtos`

```tsx
// ProductCard
- Initial: { opacity: 0, scale: 0.95 }
- Animate: { opacity: 1, scale: 1 }
- WhileHover: { y: -8 } (Lift)
- Favorite button: scale 1.1 no hover
- Badge slide-in da direita (x: 20)
- Image zoom: scale 1.05 no hover
- Quick add button: opacity 0 → 1 no hover

// Filtros
- Sidebar slide-in da esquerda
- Checkbox smooth toggle
- Slider thumb animado
```

---

### Produto Detalhe `/produtos/[id]`

```tsx
// Buy Box
- Fade-in do conteúdo (delay escalonado)
- Button scale no hover/tap
- Quantity selector smooth increment/decrement
- Voltage selector active state animation

// Image Gallery
- Thumbnail scale 1.1 quando ativo
- Main image fade transition
```

---

### Carrinho `/carrinho`

```tsx
// Empty State
- Bounce do ícone de carrinho (spring animation)
- Fade-in do texto (delay escalonado)
- Stagger das badges de sugestão
- Scale dos badges no hover

// Stepper
- Scale animation de cada step (delay 0.1s entre cada)
- Active state com pulse
- Line animation (width transition)
```

---

### Ofertas `/ofertas`

```tsx
// Hero
- Background pattern animation (infinite loop)
- Badge scale bounce (spring)
- Title fade-in + slide-up

// Offer Cards
- Stagger animation (0.1s delay)
- WhileHover: { y: -8, rotate: 1 }
- Badge slide-in (x: 100 → 0)
- Discount badge pulse effect
```

---

### Admin Dashboard `/admin/dashboard`

```tsx
// Stats Cards
- Stagger children (0.1s)
- Scale from 0.9 to 1
- WhileHover: { y: -8 }
- Number count-up effect (futuro)

// Recent Orders Table
- Row fade-in on scroll
- Status badge pulse (quando "Pendente")
```

---

### Minha Conta `/minha-conta`

```tsx
// Tabs
- Tab switch with slide transition
- Active tab underline animation
- Content fade-in on tab change

// Order Cards
- Stagger animation
- Status badge color transition
- Hover lift effect
```

---

### Contato `/contato`

```tsx
// Contact Info Cards
- Stagger from left (x: -20)
- WhileHover: { scale: 1.02 }
- Icon rotate on hover

// Form
- Field focus animation (border color + shadow)
- Button scale on hover/tap
- Submit loading spinner rotation
```

---

### Sobre `/sobre`

```tsx
// Hero
- Background pattern animation (infinite)
- Icon bounce (spring)
- Title fade-in + slide-up

// Stats Cards
- Stagger animation
- Number count-up (futuro)
- WhileHover: { y: -8 }

// Values Cards
- Icon rotate 360° on hover
- Card lift effect
- Stagger children
```

---

### Privacidade `/privacidade`

```tsx
// Sections
- Fade-in on scroll (viewport trigger)
- Icon scale animation
- List items stagger (bullet points)

// Contact CTA
- Background pulse effect
- Button hover scale
```

---

## 🎯 Padrões de Implementação

### 1. **Animações de Entrada (Page Load)**

Use `initial` + `animate`:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
```

### 2. **Animações ao Scroll (Appear on Scroll)**

Use `whileInView` + `viewport`:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5 }}
>
```

### 3. **Animações de Interação (Hover/Tap)**

Use `whileHover` + `whileTap`:

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
```

### 4. **Animações de Lista (Stagger)**

Use `variants` + `staggerChildren`:

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map((item) => (
    <motion.li key={item.id} variants={item}>
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

---

## 🚀 Performance

### Otimizações Aplicadas

1. **Layout Animations**
   - Usamos `layout` prop quando necessário
   - Evitamos animar `width` e `height` diretamente

2. **Transform vs. Position**
   - Preferimos `transform` (x, y, scale) em vez de `top`, `left`
   - Melhor performance (GPU acceleration)

3. **Reduced Motion**
   - Respeitamos `prefers-reduced-motion`
   - Animações desabilitadas para usuários que preferem

```tsx
const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={prefersReducedMotion ? {} : { scale: 1.1 }}
>
```

4. **Once Viewport**
   - Usamos `viewport={{ once: true }}` para evitar re-animações

---

## 📐 Timing e Easing

### Durations Padrão

```tsx
// Micro-interactions
{ duration: 0.2 }  // Hover, click

// Normal animations
{ duration: 0.3 }  // Cards, buttons

// Slow animations
{ duration: 0.5 }  // Page transitions, large elements

// Very slow
{ duration: 0.8 }  // Hero, special effects
```

### Spring Animations

```tsx
// Bouncy
{ type: 'spring', stiffness: 300, damping: 20 }

// Smooth
{ type: 'spring', stiffness: 200, damping: 30 }

// Gentle
{ type: 'spring', stiffness: 100, damping: 10 }
```

### Easing Functions

```tsx
// Ease In Out (padrão)
{ ease: 'easeInOut' }

// Ease Out (saída rápida)
{ ease: 'easeOut' }

// Custom cubic bezier
{ ease: [0.6, 0.01, 0.05, 0.95] }
```

---

## 🎓 Boas Práticas

### ✅ DO (Fazer)

- Use animações sutis e consistentes
- Respeite `prefers-reduced-motion`
- Anime `transform` e `opacity` (performance)
- Use `viewport={{ once: true }}` para economizar recursos
- Aplique delays progressivos em listas (stagger)

### ❌ DON'T (Não Fazer)

- Não anime `width`, `height` diretamente (use `scale`)
- Não use durações muito longas (> 1s) sem motivo
- Não anime muitos elementos simultaneamente
- Não force animações em todos os elementos (seletividade)
- Não ignore acessibilidade

---

## 📚 Recursos

### Documentação Oficial
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Animation Controls](https://www.framer.com/motion/animation/)
- [Gestures](https://www.framer.com/motion/gestures/)
- [Scroll Animations](https://www.framer.com/motion/scroll-animations/)

### Exemplos no Projeto
- `src/components/hero-section.tsx` - Hero animations
- `src/components/categories-grid.tsx` - Stagger + Rotation
- `src/components/product-card.tsx` - Hover effects
- `src/app/carrinho/page.tsx` - Empty state bounce

---

## 🎬 Conclusão

Todas as **13 páginas** do Shopping das Ferramentas incluem animações Framer Motion profissionais, proporcionando uma experiência de usuário moderna, fluida e agradável.

**Princípios aplicados:**
- ✅ Sutileza e elegância
- ✅ Performance otimizada
- ✅ Acessibilidade respeitada
- ✅ Consistência visual
- ✅ Feedback visual claro

---

*Desenvolvido com ❤️ para Shopping das Ferramentas*
