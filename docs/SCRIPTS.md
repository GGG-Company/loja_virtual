# 🛠️ SCRIPTS E COMANDOS ÚTEIS

Coleção de comandos frequentemente usados para desenvolvimento e manutenção.

---

## 📦 Gerenciamento de Dependências

### Instalar todas as dependências
```bash
npm install
```

### Atualizar dependências
```bash
npm update
```

### Verificar pacotes desatualizados
```bash
npm outdated
```

### Limpar cache do npm
```bash
npm cache clean --force
```

---

## 🗄️ Comandos Prisma

### Gerar Prisma Client
```bash
npx prisma generate
```

### Abrir Prisma Studio (GUI)
```bash
npx prisma studio
```
Acesse: http://localhost:5555

### Criar nova migration
```bash
npx prisma migrate dev --name nome_da_migration
```

### Aplicar migrations em produção
```bash
npx prisma migrate deploy
```

### Resetar banco de dados (⚠️ CUIDADO!)
```bash
npx prisma migrate reset
```

### Popular banco com seed
```bash
npm run db:seed
```

### Formatar schema.prisma
```bash
npx prisma format
```

### Validar schema
```bash
npx prisma validate
```

---

## 🐳 Docker

### Iniciar containers
```bash
docker-compose up -d
```

### Parar containers
```bash
docker-compose down
```

### Ver logs dos containers
```bash
docker-compose logs -f
```

### Reconstruir containers
```bash
docker-compose up -d --build
```

### Remover volumes (⚠️ apaga dados)
```bash
docker-compose down -v
```

### Acessar shell do PostgreSQL
```bash
docker exec -it shopping_ferramentas_db psql -U postgres -d shopping_ferramentas
```

---

## 🧪 Testes e Qualidade

### Rodar ESLint
```bash
npm run lint
```

### Corrigir automaticamente problemas de lint
```bash
npm run lint -- --fix
```

### Type-check sem build
```bash
npx tsc --noEmit
```

---

## 🚀 Build e Deploy

### Build de produção
```bash
npm run build
```

### Rodar build em produção local
```bash
npm start
```

### Analisar bundle size
```bash
npm run build
npx @next/bundle-analyzer
```

---

## 🔍 Debugging

### Ver variáveis de ambiente
```bash
# Windows (PowerShell)
Get-Content .env

# Mac/Linux
cat .env
```

### Testar conexão com banco
```bash
npx prisma db execute --stdin <<< "SELECT NOW();"
```

### Verificar portas em uso
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

---

## 📊 Queries SQL Úteis

### Conectar ao banco via Docker
```bash
docker exec -it shopping_ferramentas_db psql -U postgres -d shopping_ferramentas
```

### Ver todas as tabelas
```sql
\dt
```

### Contar produtos
```sql
SELECT COUNT(*) FROM products;
```

### Ver pedidos recentes
```sql
SELECT "orderNumber", status, total, "createdAt"
FROM orders
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Ver logs de estoque
```sql
SELECT sl.*, p.name, p.sku
FROM stock_logs sl
JOIN products p ON sl."productId" = p.id
ORDER BY sl."createdAt" DESC
LIMIT 20;
```

### Ver usuários por role
```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

---

## 🔄 Git Workflows

### Criar nova feature branch
```bash
git checkout -b feature/nome-da-feature
```

### Commit semântico
```bash
git commit -m "feat: adiciona filtro por categoria"
git commit -m "fix: corrige cálculo de frete"
git commit -m "docs: atualiza README"
```

### Push e criar PR
```bash
git push origin feature/nome-da-feature
```

### Sincronizar com main
```bash
git checkout main
git pull origin main
git checkout feature/nome-da-feature
git rebase main
```

---

## 🧹 Limpeza e Manutenção

### Remover node_modules e reinstalar
```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules
npm install

# Mac/Linux
rm -rf node_modules
npm install
```

### Limpar build do Next.js
```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force .next

# Mac/Linux
rm -rf .next
```

### Resetar banco e reseed
```bash
npx prisma migrate reset
npm run db:seed
```

---

## 🔐 Segurança

### Gerar NEXTAUTH_SECRET
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL (Mac/Linux)
openssl rand -hex 32
```

### Verificar dependências vulneráveis
```bash
npm audit
```

### Corrigir vulnerabilidades automáticas
```bash
npm audit fix
```

---

## 📈 Performance

### Analisar performance do Next.js
```bash
npm run build -- --profile
```

### Verificar tamanho de imagens
```bash
# Windows (PowerShell)
Get-ChildItem -Recurse public/products | Measure-Object -Property Length -Sum

# Mac/Linux
du -sh public/products
```

---

## 🌐 Rede e Conectividade

### Testar API com cURL
```bash
# Teste básico
curl http://localhost:3000/api/financial/config

# Com headers
curl -H "X-INTERNAL-API-KEY: sua-chave" \
     http://localhost:3000/api/integrations/stock/sync
```

### Verificar se porta está disponível
```bash
# Windows
Test-NetConnection -ComputerName localhost -Port 3000

# Mac/Linux
nc -zv localhost 3000
```

---

## 🚨 Troubleshooting Rápido

### Erro: "Port 3000 already in use"
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Mac/Linux
kill -9 $(lsof -ti:3000)
```

### Erro: "Cannot find module 'next'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: Prisma Client não gerado
```bash
npx prisma generate
```

### Aplicação lenta/travando
```bash
# Limpar cache do Next.js
rm -rf .next
npm run dev
```

---

## 📝 Logs e Monitoramento

### Ver logs do Next.js
```bash
npm run dev -- --turbo
```

### Ver logs do Docker
```bash
docker-compose logs -f postgres
```

### Exportar logs para arquivo
```bash
npm run dev > logs.txt 2>&1
```

---

## 🎯 Atalhos de Desenvolvimento

### Inicialização completa do ambiente
```bash
# Script único para começar do zero
docker-compose up -d && \
npm install && \
npx prisma migrate dev && \
npm run db:seed && \
npm run dev
```

### Reset completo do projeto
```bash
# ⚠️ CUIDADO: Remove tudo e recomeça
docker-compose down -v && \
rm -rf node_modules .next && \
npm install && \
npx prisma migrate dev && \
npm run db:seed
```

---

## 📚 Recursos Externos

### Documentação Oficial
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- NextAuth: https://next-auth.js.org/
- Tailwind: https://tailwindcss.com/docs

### Ferramentas Úteis
- Prisma Studio: http://localhost:5555
- Mailpit: http://localhost:8025
- PostgreSQL Admin: https://www.pgadmin.org/

---

**💡 Dica:** Adicione estes comandos ao seu `package.json` como scripts personalizados para facilitar o uso!
