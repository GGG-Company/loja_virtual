# Frontend

## Páginas e rotas

### Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `app/page.tsx` | Homepage — banners, destaques, categorias |
| `/produtos` | `app/produtos/page.tsx` | Listagem com filtros (categoria, busca, preço, ordenação) |
| `/produtos/[id]` | `app/produtos/[id]/page.tsx` | Detalhe do produto — imagens, variantes, avaliações, frete |
| `/ofertas` | `app/ofertas/page.tsx` | Produtos promocionais |
| `/sobre` | `app/sobre/page.tsx` | Sobre a empresa |
| `/contato` | `app/contato/page.tsx` | Página de contato |
| `/termos` | `app/termos/page.tsx` | Termos de uso |
| `/privacidade` | `app/privacidade/page.tsx` | Política de privacidade |

### Autenticação

| Rota | Descrição |
|------|-----------|
| `/auth/login` | Login com email/senha ou Google |
| `/auth/register` | Cadastro de nova conta |

### Carrinho e Checkout

| Rota | Descrição |
|------|-----------|
| `/carrinho` | Carrinho com itens, cupom e resumo de valores |
| `/checkout/dados` | Dados pessoais e endereço |
| `/checkout/entrega` | Seleção de método de entrega (cotação Melhor Envio) |
| `/checkout/pagamento` | Seleção de método de pagamento |
| `/checkout/confirmacao` | Confirmação do pedido |
| `/pagamento/[id]` | Página de pagamento para pedido existente |

O fluxo de checkout usa `sessionStorage` para persistir os dados entre as etapas (dados, endereço, método de entrega).

### Área do cliente (`/minha-conta`)

Página única com abas (tabs):

| Aba | Descrição |
|-----|-----------|
| `perfil` | Dados pessoais e endereço |
| `pedidos` | Lista de pedidos com status |
| `devolucoes` | Solicitações de devolução |
| `suporte` | Contato com suporte |
| `notificacoes` | Notificações do sistema |

Rotas dedicadas:
- `/minha-conta/pedidos/[id]` — Detalhe do pedido
- `/minha-conta/pedidos/[id]/devolucao` — Solicitar devolução

### Admin (`/admin`)

Acesso restrito a roles `ADMIN` e `OWNER`. Role `OWNER` tem acesso adicional ao módulo financeiro.

| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Estatísticas e KPIs em tempo real |
| `/admin/orders` | Lista de pedidos com filtros e busca |
| `/admin/orders/[id]` | Detalhe do pedido — status, etiqueta, histórico |
| `/admin/orders/enviados` | Pedidos com status SHIPPED e rastreamento |
| `/admin/products` | Catálogo de produtos |
| `/admin/products/new` | Criar produto |
| `/admin/products/[id]` | Editar produto |
| `/admin/gerenciamento/devolucoes` | Gestão de devoluções |
| `/admin/gerenciamento/devolucoes/[id]` | Detalhe da devolução |
| `/admin/gerenciamento/categories` | Categorias (hierárquicas) |
| `/admin/gerenciamento/coupons` | Cupons de desconto |
| `/admin/financial` | Relatório financeiro (OWNER) |
| `/admin/financial/reports` | Exportação de relatórios Excel (OWNER) |
| `/admin/picking` | Lista de picking para separação de pedidos |
| `/admin/reviews` | Moderação de avaliações |
| `/admin/settings` | Configurações: Mercado Pago, Melhor Envio, Webhooks |

---

## Componentes principais

### Carrinho

`src/components/cart-*.tsx` — Estado do carrinho gerenciado via Context API (`CartContext`). Persiste no banco para usuários autenticados, em localStorage para guests.

### Pagamento

`src/components/mercadopago-payment-brick.tsx` — Wrapper do Payment Brick do SDK Mercado Pago. Carregado dinamicamente (no SSR) pois requer `window`.

`src/components/pix-payment.tsx` — QR Code PIX com copia-e-cola e polling de status.

`src/components/boleto-payment.tsx` — Link e código de barras do boleto.

### Assistente

`src/components/chat-assistant.tsx` — Widget flutuante com dois modos:
- **Smart**: Responde com regras pré-definidas (sem API externa).
- **AI**: Usa GPT-4o-mini via `/api/assistant-ai`. Modo controlado por `SiteConfig.assistantMode` (configurável diretamente no banco — não há UI de admin para isso).

### Suporte (`/minha-conta` > aba Suporte)

`src/components/support-chat-tab.tsx` — Exibe informações de contato (telefone, e-mail, horário).

---

## Estilização

- **Tailwind CSS** como base. Configuração em `tailwind.config.ts`.
- **shadcn/ui** para componentes base — todos em `src/components/ui/`.
- **Cor primária**: `#CC1020` (vermelho) — usada em botões, badges, destaques.
- **Fonte**: Inter (Google Fonts, via `next/font`).
- **Framer Motion**: Animações de entrada nas páginas de produto, checkout e admin.
- **Tema escuro**: Não implementado.

### Convenções CSS

- Mobile-first: classes responsivas com `sm:`, `md:`, `lg:`.
- Componentes de UI usam `cn()` (de `src/lib/utils.ts`) para merge de classnames condicionais.

---

## Gerenciamento de estado

| Estado | Onde fica |
|--------|-----------|
| Sessão do usuário | NextAuth (`useSession`) |
| Carrinho | Context API (`CartContext`) + banco/localStorage |
| Formulários | react-hook-form + zod |
| Estado de UI (modais, abas) | useState local |
| Dados do servidor | fetch nativo + revalidação manual (sem React Query) |

---

## Variáveis de ambiente (frontend)

Variáveis com prefixo `NEXT_PUBLIC_` são embutidas no bundle em tempo de build. Após alterar qualquer uma delas, rodar `npm run dev:clean`.

```env
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY # Chave pública MP exposta ao browser
NEXT_PUBLIC_APP_NAME                # Nome exibido no título e header
NEXT_PUBLIC_APP_URL                 # URL pública da aplicação
```

---

## Otimizações Next.js

- **`output: 'standalone'`** — Build otimizado para Docker.
- **Remote image domains** configurados em `next.config.mjs`: Google avatars, GitHub avatars, AWS S3, Mercado Livre.
- **ISR** (Incremental Static Regeneration): catálogo de produtos revalida a cada 1h, homepage a cada 10min.
- **Dynamic imports**: SDK do Mercado Pago carregado apenas no client-side (requer `window`).
