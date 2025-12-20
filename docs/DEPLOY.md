# ☑️ CHECKLIST DE DEPLOY

Use este checklist antes de fazer deploy em produção.

---

## 🔐 Segurança

- [ ] **Gerar NEXTAUTH_SECRET forte**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Gerar X_INTERNAL_API_KEY única**
  ```bash
  openssl rand -hex 32
  ```

- [ ] **Configurar Google OAuth**
  - [ ] Criar projeto no Google Cloud Console
  - [ ] Adicionar URLs autorizadas (https://seudominio.com/api/auth/callback/google)
  - [ ] Copiar Client ID e Secret

- [ ] **Configurar variáveis de ambiente de produção**
  - [ ] DATABASE_URL (usar serviço gerenciado: Neon, Supabase, Railway)
  - [ ] NEXTAUTH_URL (https://seudominio.com)
  - [ ] NEXTAUTH_SECRET
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] X_INTERNAL_API_KEY

- [ ] **Remover .env do repositório** (usar .gitignore)

- [ ] **Habilitar HTTPS** (Vercel faz automaticamente)

---

## 🗄️ Banco de Dados

- [ ] **Escolher provedor de PostgreSQL**
  - Opções: Neon, Supabase, Railway, AWS RDS, DigitalOcean

- [ ] **Criar banco de produção**

- [ ] **Rodar migrations**
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **NÃO rodar seed em produção**

- [ ] **Configurar backups automáticos**

- [ ] **Configurar connection pooling** (Prisma Data Proxy ou PgBouncer)

---

## ⚙️ Configuração Next.js

- [ ] **Atualizar next.config.mjs**
  ```javascript
  const nextConfig = {
    output: 'standalone', // Para Docker
    images: {
      domains: ['seudominio.com'],
    },
  };
  ```

- [ ] **Verificar análise de bundle**
  ```bash
  npm run build
  ```

- [ ] **Testar build localmente**
  ```bash
  npm run build
  npm start
  ```

---

## 🚀 Deploy (Vercel)

- [ ] **Conectar repositório GitHub à Vercel**

- [ ] **Configurar variáveis de ambiente no painel Vercel**
  - Settings → Environment Variables

- [ ] **Configurar domínio customizado** (opcional)

- [ ] **Ativar Vercel Analytics** (opcional)

- [ ] **Fazer primeiro deploy**
  ```bash
  git push origin main
  ```

---

## 📧 Email (Produção)

- [ ] **Escolher provedor SMTP**
  - Opções: SendGrid, Mailgun, Postmark, AWS SES

- [ ] **Configurar variáveis SMTP**
  ```env
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASSWORD=sua_api_key
  ```

- [ ] **Configurar domínio para emails** (SPF, DKIM)

- [ ] **Testar envio de emails**

---

## 🔍 Monitoramento

- [ ] **Configurar Sentry** (Error Tracking)
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard -i nextjs
  ```

- [ ] **Configurar Google Analytics ou Vercel Analytics**

- [ ] **Configurar logs estruturados** (Logtail, Datadog)

- [ ] **Configurar alertas** (Discord, Slack, Email)

---

## 🧪 Testes Pré-Deploy

- [ ] **Testar todas as rotas principais**
  - [ ] Homepage
  - [ ] Login/Registro
  - [ ] Catálogo de produtos
  - [ ] Carrinho
  - [ ] Checkout
  - [ ] Painel Admin
  - [ ] Painel Owner (Financeiro)

- [ ] **Testar APIs de integração**
  ```bash
  curl -X POST https://seudominio.com/api/integrations/stock/sync \
    -H "X-INTERNAL-API-KEY: sua-chave" \
    -d '{"sku":"TEST","quantity":10,"source":"ADMIN"}'
  ```

- [ ] **Testar responsividade** (Mobile, Tablet, Desktop)

- [ ] **Testar performance** (Lighthouse)

- [ ] **Testar SEO** (meta tags, sitemap)

---

## 🌐 DNS e Domínio

- [ ] **Comprar domínio** (Registro.br, Namecheap, GoDaddy)

- [ ] **Configurar DNS**
  - [ ] Apontar A record para Vercel (ou CNAME)
  - [ ] Configurar SSL/TLS

- [ ] **Ativar HTTPS** (obrigatório para NextAuth)

---

## 📊 Analytics e Tracking

- [ ] **Google Analytics 4**
  ```javascript
  // app/layout.tsx
  <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
  ```

- [ ] **Meta Pixel** (Facebook Ads)

- [ ] **Google Tag Manager**

- [ ] **Hotjar ou Clarity** (Heatmaps)

---

## 🔄 CI/CD

- [ ] **Configurar GitHub Actions** (opcional)
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - run: npm install
        - run: npm run build
        - run: npm run lint
  ```

- [ ] **Configurar testes automáticos** (opcional)

- [ ] **Configurar deploy preview** (Vercel faz automaticamente)

---

## 📝 Documentação

- [ ] **Atualizar README.md** com URL de produção

- [ ] **Criar CHANGELOG.md** para versões

- [ ] **Documentar APIs** (Swagger/OpenAPI)

- [ ] **Criar guia de onboarding para time**

---

## 🚨 Pós-Deploy

- [ ] **Testar todas as funcionalidades em produção**

- [ ] **Monitorar logs por 24h**

- [ ] **Verificar performance** (Vercel Speed Insights)

- [ ] **Testar integrações externas** (ML, Hiper, Bot WhatsApp)

- [ ] **Criar backup manual do banco**

- [ ] **Notificar stakeholders** (Dono, Gerente)

---

## 📞 Suporte

- [ ] **Configurar canal de suporte** (Email, WhatsApp, Chat)

- [ ] **Criar FAQ** para usuários

- [ ] **Documentar procedimentos de emergência**

---

## ⚠️ Rollback Plan

Caso algo dê errado:

1. **Reverter deploy no Vercel**
   - Settings → Deployments → Revert

2. **Restaurar backup do banco**
   ```bash
   pg_restore -d DATABASE_URL backup.dump
   ```

3. **Comunicar time e usuários**

---

**✅ Deploy Ready!**

Quando todos os itens estiverem marcados, seu sistema estará pronto para produção! 🚀
