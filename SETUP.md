# Guia de Configuração — Feira das Ferramentas

Este documento cobre tudo que precisa ser configurado para colocar o site em funcionamento em um novo servidor.

---

## Requisitos do Servidor (VPS)

- Ubuntu 20.04+ ou Debian 11+
- Docker + Docker Compose
- Git
- Acesso root via SSH
- Porta 5000 liberada (ou via proxy reverso na 80/443)
- Mínimo: 2 vCPU, 2 GB RAM, 20 GB disco

### Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

---

## 1. Clonar o Repositório

```bash
git clone https://github.com/GGG-Company/loja_virtual.git
cd loja_virtual
```

---

## 2. Configurar o `.env`

Crie o arquivo `.env` na raiz do projeto:

```bash
nano .env
```

Preencha com os valores abaixo:

```env
NODE_ENV="production"

# ── Banco de Dados ────────────────────────────────────────────────
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/NOME_BANCO?schema=public&connection_limit=5&pool_timeout=10"

# ── NextAuth ──────────────────────────────────────────────────────
NEXTAUTH_URL="https://SEU_DOMINIO.com.br"
NEXTAUTH_SECRET="GERE_COM: openssl rand -base64 32"
AUTH_TRUST_HOST=true

# ── Google OAuth (opcional) ───────────────────────────────────────
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"

# ── Segurança Interna ─────────────────────────────────────────────
X_INTERNAL_API_KEY="GERE_COM: openssl rand -hex 32"

# ── Mercado Pago ──────────────────────────────────────────────────
# Encontre em: mercadopago.com.br → Seu Negócio → Configurações → Chaves da API
MERCADO_PAGO_PUBLIC_KEY="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-xxxxxxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxx"
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MERCADO_PAGO_WEBHOOK_SECRET="GERE_COM: openssl rand -hex 32"
MERCADO_PAGO_SANDBOX="false"

# ── Hiper ERP (baixa de estoque) ──────────────────────────────────
HIPER_API_SECRET_KEY="chave-api-hiper"

# ── Email (SMTP) ──────────────────────────────────────────────────
SMTP_HOST="smtp.seudominio.com.br"
SMTP_PORT="587"
SMTP_USER="email@seudominio.com.br"
SMTP_PASSWORD="senha-smtp"

# ── Aplicação ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME="Shopping das Ferramentas"
NEXT_PUBLIC_APP_URL="https://SEU_DOMINIO.com.br"
NEXT_APP_URL="https://SEU_DOMINIO.com.br"

# ── Webhook n8n (notificações de pedido) ─────────────────────────
N8N_ORDERS_WEBHOOK_URL="https://webhook.seudominio.com.br/webhook/SLUG"

# ── Melhor Envio ──────────────────────────────────────────────────
MELHOR_ENVIO_SANDBOX="false"
MELHOR_ENVIO_CLIENT_ID="ID_DO_APP"
MELHOR_ENVIO_CLIENT_SECRET="SECRET_DO_APP"
MELHOR_ENVIO_CALLBACK="https://SEU_DOMINIO.com.br/api/integrations/melhor-envio/callback"
MELHOR_ENVIO_USER_AGENT="Nome da Loja (email@loja.com.br)"
MELHOR_ENVIO_SCOPES="cart-read cart-write shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking shipping-cancel ecommerce-shipping shipping-companies orders-read users-read"

# ── Frete ─────────────────────────────────────────────────────────
ORIGIN_ZIP="44002264"
SHIPPING_ORIGIN_ZIP=44002264
MELHOR_ENVIO_SERVICES=1,2,3,4,5,6,7,8

# ── Dados do Remetente (etiquetas) ────────────────────────────────
STORE_NAME="Nome da Loja"
STORE_PHONE="75999999999"
STORE_EMAIL="contato@loja.com.br"
STORE_CPF="00000000000"
STORE_CNPJ=""
STORE_ADDRESS="Rua Exemplo"
STORE_NUMBER="100"
STORE_COMPLEMENT=""
STORE_DISTRICT="Centro"
STORE_CITY="Feira de Santana"
STORE_STATE="BA"

# ── Redis ─────────────────────────────────────────────────────────
REDIS_URL="redis://:SENHA@HOST:6379"

# ── Socket.io ─────────────────────────────────────────────────────
NEXT_PUBLIC_SOCKET_URL=https://socket.SEU_DOMINIO.com.br:8444

# ── Analytics (opcional) ──────────────────────────────────────────
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_META_PIXEL_ID="XXXXXXXXXXXXXXXXX"

# ── Sandbox auto-aprovar (deixar false em produção) ───────────────
SANDBOX_AUTO_APPROVE=false
```

---

## 3. Subir a Aplicação

```bash
docker compose build --no-cache
docker compose up -d
docker compose logs -f
```

A aplicação sobe na porta **5000**.

---

## 4. Migrations do Banco

As migrations rodam automaticamente no startup via Prisma. Se precisar rodar manualmente:

```bash
docker compose exec app npx prisma migrate deploy
```

---

## 5. Configurar o MercadoPago no Painel Admin

Após subir o servidor, acesse `/admin/configurações` e configure as chaves do Mercado Pago pela interface. O sistema detecta automaticamente se é sandbox (`TEST-`) ou produção (`APP_USR-`).

---

## 6. Proxy Reverso (Nginx)

Exemplo de configuração Nginx para expor na porta 443:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name SEU_DOMINIO.com.br;

    ssl_certificate     /etc/letsencrypt/live/SEU_DOMINIO.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Certbot para SSL:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d SEU_DOMINIO.com.br
```

---

## 7. GitHub Actions — Deploy Automático

O repositório já tem o workflow em `.github/workflows/deploy.yml`. Ele faz deploy automático no VPS a cada push na branch `main`.

### 7.1 Gerar chave SSH no VPS

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys ~/.ssh/github_actions
cat ~/.ssh/github_actions
```

Copie todo o conteúdo exibido (do `-----BEGIN` ao `-----END`).

### 7.2 Configurar Secrets no GitHub

Acesse: `GitHub → Repositório → Settings → Secrets and variables → Actions → New repository secret`

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP do servidor (ex: `72.61.37.230`) |
| `VPS_USER` | `root` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | Conteúdo completo da chave privada `~/.ssh/github_actions` |

### 7.3 Testar o deploy

```bash
git commit --allow-empty -m "test deploy" && git push
```

Acompanhe em: `GitHub → Actions`

---

## 8. Variáveis Obrigatórias vs Opcionais

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Conexão com PostgreSQL |
| `NEXTAUTH_URL` | Sim | URL pública da aplicação |
| `NEXTAUTH_SECRET` | Sim | Segredo de sessão |
| `MERCADO_PAGO_ACCESS_TOKEN` | Sim | Token de pagamento |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | Sim | Chave pública do MP |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | Sim | Envio de email |
| `REDIS_URL` | Sim | Cache e sessões |
| `HIPER_API_SECRET_KEY` | Não | Integração ERP Hiper |
| `N8N_ORDERS_WEBHOOK_URL` | Não | Notificações via n8n |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Não | Google Analytics 4 |
| `NEXT_PUBLIC_META_PIXEL_ID` | Não | Meta Pixel |
| `MELHOR_ENVIO_CLIENT_SECRET` | Não | Cálculo de frete |

---

## 9. Comandos Úteis no VPS

```bash
# Ver logs em tempo real
docker compose logs -f

# Reiniciar sem rebuild
docker compose restart

# Rebuild completo
docker compose down && docker compose build --no-cache && docker compose up -d

# Acessar o shell do container
docker compose exec app sh

# Verificar banco de dados
psql "postgresql://USUARIO:SENHA@HOST:5432/NOME_BANCO"

# Checar configuração do MercadoPago no banco
psql "postgresql://..." -c 'SELECT id, "publicKey", environment FROM mercado_pago_config;'
```
