# Backend

API Routes Next.js (App Router). Todos os handlers estão em `src/app/api/`.

---

## Autenticação

Baseada em NextAuth v5 (`auth.ts`). A função `auth()` retorna a session atual em qualquer Server Component ou Route Handler.

- **Sessão JWT** com maxAge 7 dias.
- **Roles**: `CUSTOMER`, `ADMIN`, `OWNER`.
- **Proteção de rotas admin**: verificar `session?.user?.role === 'ADMIN' || 'OWNER'` em cada handler.
- **Providers**: Credentials (email + bcrypt) e Google OAuth.

---

## Rotas de API

### Autenticação (`/api/auth/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| * | `/api/auth/[...nextauth]` | Handler NextAuth (login, callback, logout) |
| POST | `/api/auth/register` | Cadastro de novo usuário |
| POST | `/api/auth/change-password` | Alteração de senha (autenticado) |

### Usuário (`/api/user/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/PUT | `/api/user/account` | Perfil do usuário |
| GET/POST/PUT | `/api/user/addresses` | Endereços de entrega |
| POST | `/api/user/password` | Gerenciamento de senha |
| GET | `/api/user/orders` | Lista de pedidos do usuário |
| GET | `/api/user/orders/[id]` | Detalhes de um pedido |
| POST | `/api/user/orders/[id]/confirm-delivery` | Confirmar recebimento |
| GET | `/api/user/export` | Exportar dados pessoais (LGPD) |

### Produtos (`/api/products/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Listagem com filtros (categoria, busca, preço, ordenação, paginação) |
| GET | `/api/products/[id]` | Detalhe do produto |
| GET | `/api/products/[id]/reviews` | Avaliações do produto |
| POST | `/api/products/[id]/reviews` | Enviar avaliação (autenticado, compra verificada) |
| GET | `/api/products/[id]/related` | Produtos relacionados |

### Pedidos (`/api/orders/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/orders` | Criar pedido |
| GET | `/api/orders/[id]/payment` | Status do pagamento |
| POST | `/api/orders/quote` | Cotação de pedido sem checkout |

### Pagamentos (`/api/payments/mercadopago/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/payments/mercadopago/public-key` | Retorna chave pública MP |
| POST | `/api/payments/mercadopago/process` | Processa cartão crédito/débito |
| POST | `/api/payments/mercadopago/pix` | Gera QR Code PIX |
| POST | `/api/payments/mercadopago/boleto` | Gera boleto |
| POST | `/api/payments/mercadopago/webhook` | Recebe notificações MP (assinatura verificada) |
| POST | `/api/payments/mercadopago/simulate-approval` | Simula aprovação (apenas dev/sandbox) |

### Frete (`/api/shipping/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/shipping/quote` | Cotação de frete (CEP + itens) |
| POST | `/api/shipping/track` | Rastreamento de envio |
| GET | `/api/shipping/pickups` | Pontos de coleta ME |

### Cupons

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/coupons/validate` | Valida e calcula desconto de cupom |

### Suporte (`/api/support/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/support/chats` | Lista/cria conversas de suporte |
| GET/POST/PATCH | `/api/support/chats/[chatId]` | Mensagens e status do chat |
| GET | `/api/support/my-chat` | Chat ativo do usuário autenticado |

### Devoluções (`/api/returns/`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/returns` | Lista/cria solicitações de devolução |
| GET/PUT | `/api/returns/[id]` | Detalhe e atualização |
| POST | `/api/returns/[id]/approve` | Aprovar devolução |

### Assistente IA

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/assistant` | Assistente smart (regras) |
| POST | `/api/assistant-ai` | Assistente IA (GPT-4o-mini) |

### Integrações externas (`/api/integrations/`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/integrations/melhor-envio/authorize` | — | Inicia OAuth ME |
| GET | `/api/integrations/melhor-envio/callback` | — | Callback OAuth ME |
| POST | `/api/integrations/melhor-envio/webhook` | — | Webhooks de envio |
| POST | `/api/integrations/stock/sync` | X_INTERNAL_API_KEY | Sync de estoque (ML, Hiper) |
| POST | `/api/integrations/orders/update-status` | X_INTERNAL_API_KEY | Atualiza status de pedidos via webhook |
| POST | `/api/integrations/marketing/abandoned-carts` | X_INTERNAL_API_KEY | Gatilho de e-mail carrinhos abandonados |

### Admin (`/api/admin/`)

Todas as rotas exigem role `ADMIN` ou `OWNER`.

| Grupo | Rotas |
|-------|-------|
| Produtos | `GET/POST /api/admin/products`, `GET/PUT/DELETE /api/admin/products/[id]` |
| Pedidos | `GET/POST /api/admin/orders`, CRUD em `[id]`, label, shipping, reverse |
| Financeiro | `GET /api/admin/financial/summary`, `GET /api/admin/financial/export` (Excel) |
| Devoluções | `GET/POST /api/admin/returns`, `GET/PUT /api/admin/returns/[id]` |
| Cupons | `GET/POST/PUT /api/admin/coupons`, `DELETE /api/admin/coupons/[id]` |
| Categorias | `GET/POST /api/admin/categories`, `DELETE /api/admin/categories/[id]` |
| Picking | `GET/POST /api/admin/picking`, `PUT /api/admin/picking/[id]` |
| Reviews | `GET/POST /api/admin/reviews` |
| Stats | `GET /api/admin/stats` |
| Config MP | `GET/PUT /api/admin/integrations/mercado-pago/config` |
| Config ME | `GET /api/admin/integrations/melhor-envio/status` |
| Site Config | `GET/PUT /api/admin/site-config` |

### Utilitários

| Rota | Descrição |
|------|-----------|
| `POST /api/cron/cancel-stale-orders` | Cancela pedidos sem pagamento após X horas (cron job) |
| `GET /api/financial/config` | Config financeira pública (sem dados sensíveis) |
| `GET /api/site-config` | Config do site (modo do assistente, etc.) |
| `POST /api/upload` | Upload de imagens |

---

## Regras de negócio relevantes

### Criação de pedido

1. Valida itens e estoque no banco.
2. Aplica cupom se informado (PERCENTAGE ou FIXED, respeitando escopo e limite de uso).
3. Calcula frete via `ShippingRule` ou Melhor Envio.
4. Aplica juros de parcelamento conforme `FinancialConfig`.
5. Cria `Order` com status `PENDING`.
6. Pagamento aprovado via webhook MP → status `PAID` → decrementa estoque.

### Status de pedido

```
PENDING → PAID → PREPARING → SHIPPED → DELIVERED
                                     ↓
                              CANCELLED / RETURNED
```

Status `WAITING_PAYMENT` para boleto/PIX pendentes.

### Sender no suporte

Determinado na criação da mensagem (`POST /api/support/chats/[chatId]`):
- Admin enviando mensagem → `sender = 'attendant'`
- Cliente enviando → `sender = 'customer'`

### Devolução

Criada pelo cliente (`POST /api/returns`). Admin aprova e gera etiqueta reversa via Melhor Envio. Itens devolvidos incrementam estoque quando `Return.status = 'COMPLETED'`.

### Webhook Mercado Pago

Verifica assinatura HMAC-SHA256 com `MERCADO_PAGO_WEBHOOK_SECRET` antes de processar. Idempotente: ignora notificações duplicadas do mesmo `paymentId`.

---

## Variáveis de ambiente

```env
DATABASE_URL                    # PostgreSQL connection string
NEXTAUTH_URL                    # URL pública da aplicação
NEXTAUTH_SECRET                 # Segredo JWT (openssl rand -base64 32)
GOOGLE_CLIENT_ID                # OAuth Google
GOOGLE_CLIENT_SECRET            # OAuth Google
X_INTERNAL_API_KEY              # Chave para webhooks internos (openssl rand -hex 32)
OPENAI_API_KEY                  # Opcional — habilita assistente IA
REDIS_URL                       # redis://user:pass@host:6379 (opcional — fallback in-memory)
MERCADO_PAGO_PUBLIC_KEY         # Chave pública MP
MERCADO_PAGO_ACCESS_TOKEN       # Token de acesso MP
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY  # Exposta ao browser
MERCADO_PAGO_SANDBOX            # "true" em desenvolvimento
MERCADO_PAGO_WEBHOOK_SECRET     # Secret para verificação HMAC
MELHOR_ENVIO_CLIENT_ID          # OAuth ME
MELHOR_ENVIO_CLIENT_SECRET      # OAuth ME
MELHOR_ENVIO_CALLBACK           # URL de callback OAuth
MELHOR_ENVIO_USER_AGENT         # User-Agent obrigatório pela ME
SHIPPING_ORIGIN_ZIP             # CEP de origem para cotações
MELHOR_ENVIO_SANDBOX            # "true" em desenvolvimento
MELHOR_ENVIO_SERVICES           # IDs separados por vírgula (ex: "1,2" = PAC, SEDEX)
STORE_NAME / STORE_PHONE / STORE_EMAIL / STORE_CPF / STORE_CITY / STORE_STATE
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD
```
