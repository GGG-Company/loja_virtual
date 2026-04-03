# Arquitetura

## Visão geral

```
Browser
  │
  └── HTTPS :443 ──► Nginx ──► Next.js (standalone, porta 3000)
                                  ├── App Router (SSR / SSG / ISR)
                                  ├── API Routes (/api/*)
                                  └── Prisma ──► PostgreSQL
                                                    │
                                              Redis (pub/sub, rate limiting)
```

---

## Estrutura de pastas

```
loja_virtual/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Páginas públicas
│   │   ├── admin/              # Painel administrativo (ADMIN/OWNER)
│   │   ├── auth/               # Login e cadastro
│   │   ├── checkout/           # Fluxo de compra (dados → entrega → pagamento → confirmação)
│   │   ├── minha-conta/        # Área do cliente autenticado
│   │   └── api/                # API Routes (Next.js Route Handlers)
│   ├── components/
│   │   ├── ui/                 # Primitivos shadcn/ui (Button, Input, Dialog...)
│   │   ├── chat/               # Componentes e utilitários do assistente virtual
│   │   └── *.tsx               # Componentes de domínio (cart, checkout, produto...)
│   ├── lib/
│   │   ├── prisma.ts           # Singleton do Prisma Client
│   │   ├── redis.ts            # Cliente Redis com fallback in-memory
│   │   ├── mercadopago-config.ts  # Config dinâmica do Mercado Pago (db-driven)
│   │   ├── melhorenvio-oauth.ts   # OAuth 2.0 e gestão de tokens ME
│   │   └── melhorenvio-shipping.ts # Geração de etiquetas
│   └── hooks/                  # Custom React hooks de negócio
├── prisma/
│   ├── schema.prisma           # 29 modelos
│   └── migrations/             # Histórico SQL versionado
├── redis/
│   └── docker-compose.yml      # Redis 7 (cache, pub/sub, rate limiting)
├── auth.ts                     # Configuração NextAuth v5
├── next.config.mjs             # CSP, headers, env, ISR, remote images
└── prisma/setup-raw.sql        # SQL bruto para setup inicial
```

---

## Banco de dados

**Provider**: PostgreSQL 15+, via Prisma ORM.

### Modelos principais

| Modelo | Descrição |
|--------|-----------|
| `User` | Clientes e admins. Role: `CUSTOMER`, `ADMIN`, `OWNER`. Campos: nome, email, senha (bcrypt), CPF/CNPJ, endereço, birthDate, tokenVersion (para revogação), deletedAt (soft delete) |
| `Product` | SKU, EAN, slug, preço, preço promocional, custo, estoque, dimensões/peso, IDs externos (ML, Hiper), specs JSON, flags featured/promo |
| `ProductVariant` | Variantes de produto com SKU, preço e estoque próprios |
| `ProductImage` | Imagens ordenadas por posição |
| `Category` | Hierárquica via `parentId` auto-relacional |
| `Order` | Pedido completo: status (9 estados), método de pagamento (5 tipos), subtotal/desconto/frete/total, paymentId (MP), endereço de entrega (JSON), tracking, campos Melhor Envio |
| `OrderItem` | Linha de pedido (produto, quantidade, preço no momento da compra) |
| `Cart` / `CartItem` | Carrinho persistido para usuários autenticados e guests (sessionId) |
| `Coupon` | Cupons: PERCENTAGE ou FIXED, escopo GLOBAL/CATEGORY/PRODUCT/STATE, limite de uso |
| `Return` / `ReturnItem` | Devoluções com workflow de status e integração Melhor Envio |
| `Review` | Avaliações com nota, compra verificada e resposta do vendedor |
| `SupportChat` / `SupportMessage` | Chat de suporte com status OPEN/IN_PROGRESS/CLOSED. sender: "customer" ou "attendant" |
| `Conversation` / `ConversationMessage` | Histórico de conversas com assistente IA |
| `FinancialConfig` | Singleton: taxas de juros, máx. parcelas, frete grátis a partir de |
| `ShippingRule` | Regras de frete por estado (ou all) com preço fixo ou grátis |
| `MercadoPagoConfig` | Singleton: chaves MP, ambiente, webhook secret |
| `MelhorEnvioToken` | Singleton: token OAuth ME com refresh automático |
| `StockLog` | Auditoria de mudanças de estoque por fonte (ADMIN, MERCADO_LIVRE, HIPER...) |
| `ActivityLog` | Auditoria de ações de usuários |
| `IntegrationLog` | Log de requests/responses das integrações externas |
| `Banner` | Banners de marketing com datas de ativação |
| `SiteConfig` | Singleton: modo do assistente (`smart` ou `ai`) |

---

## Integrações externas

### Mercado Pago

- **Configuração**: Chaves e ambiente armazenados em `MercadoPagoConfig` (banco), não apenas em env. Permite troca sem redeploy via painel admin (`/admin/settings`).
- **Métodos aceitos**: Payment Brick (cartão crédito/débito), PIX, Boleto.
- **Webhook**: `POST /api/payments/mercadopago/webhook` — recebe notificações de pagamento, atualiza status do pedido.
- **Parcelamento**: Regras dinâmicas via `FinancialConfig` (juros, máx. parcelas).
- **Sandbox**: Controlado por `MERCADO_PAGO_SANDBOX=true`.

### Melhor Envio

- **Auth**: OAuth 2.0. Fluxo: `/api/integrations/melhor-envio/authorize` → callback → token salvo em `MelhorEnvioToken`. Refresh automático antes da expiração.
- **Cotação**: `POST /api/shipping/quote` — calcula frete PAC/SEDEX/etc. com dimensões e peso do produto.
- **Etiquetas**: `POST /api/admin/orders/[id]/label` — gera etiqueta no ME e salva URL no pedido.
- **Rastreio**: `POST /api/shipping/track` — status de rastreamento.
- **Webhook**: `POST /api/integrations/melhor-envio/webhook` — atualizações de status de envio.

### Redis

- **Rate limiting**: Proteção contra brute-force no login (5 tentativas / 15 min) via `src/lib/redis.ts`.
- **Pub/sub**: Publica eventos de notificação (`notifications:user:${userId}`) e suporte (`support:chat:${chatId}`) para eventual integração futura.
- **Fallback**: Se `REDIS_URL` não estiver configurado, usa Map in-memory automaticamente.

### OpenAI

- **Modo**: Alternativo ao assistente "smart" (regras). Controlado por `SiteConfig.assistantMode` no banco.
- **Modelo**: GPT-4o-mini.
- **Rota**: `POST /api/assistant-ai`.
- **Opcional**: Se `OPENAI_API_KEY` não estiver configurado, apenas o modo smart fica disponível.

---

## Segurança

- **CSP** configurado no `next.config.mjs`: restringe `script-src`, `connect-src`, `frame-src` por domínio.
- **HSTS** habilitado em produção via header `Strict-Transport-Security`.
- **Rate limiting** no login via Redis (brute-force protection).
- **RBAC**: Verificação de role em cada handler admin — `session?.user?.role === 'ADMIN' || 'OWNER'`.
- **Token versioning**: Incrementar `User.tokenVersion` invalida todos os JWTs ativos do usuário.
- **API key interna**: `X_INTERNAL_API_KEY` protege webhooks e rotas de integração.
- **Bcrypt**: Senhas com salt rounds 10.

---

## Cache e performance (Next.js)

| Rota | Estratégia |
|------|-----------|
| Imagens de produtos | `Cache-Control: public, max-age=86400, stale-while-revalidate=3600` |
| Catálogo de produtos | ISR — revalidação a cada 1 hora |
| Homepage | ISR — revalidação a cada 10 minutos |
| Assets estáticos | `max-age=31536000, immutable` |
