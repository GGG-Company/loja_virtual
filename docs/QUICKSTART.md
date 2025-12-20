# ⚡ GUIA RÁPIDO - 5 MINUTOS PARA RODAR

Siga estes passos para ter o projeto rodando em 5 minutos.

---

## ✅ Pré-requisitos

Certifique-se de ter instalado:
- ✅ Node.js 18+ ([download](https://nodejs.org))
- ✅ Docker Desktop ([download](https://docker.com/products/docker-desktop))

---

## 🚀 Passo a Passo

### 1️⃣ Clone e Entre no Projeto
```bash
git clone <seu-repositorio>
cd loja_virtual
```

### 2️⃣ Configure o .env
```bash
# Windows (PowerShell)
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

**⚠️ IMPORTANTE:** Abra o `.env` e gere uma chave secreta:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Cole o resultado em `NEXTAUTH_SECRET`.

### 3️⃣ Inicie o Docker
```bash
docker-compose up -d
```
Aguarde ~30 segundos para PostgreSQL iniciar.

### 4️⃣ Instale as Dependências
```bash
npm install
```

### 5️⃣ Configure o Banco de Dados
```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 6️⃣ Rode o Projeto
```bash
npm run dev
```

### 7️⃣ Acesse no Navegador
```
http://localhost:3000
```

---

## 🎉 Pronto! Agora Teste:

### Login
```
Email: dono@loja.com
Senha: senha123
Role: OWNER (acesso total)
```

### Painel Admin
```
http://localhost:3000/admin/dashboard
```

### Prisma Studio (Visualizar Banco)
```bash
npm run db:studio
```
Acesse: http://localhost:5555

### Mailpit (Ver Emails)
```
http://localhost:8025
```

---

## ❌ Problemas?

### Porta 3000 ocupada
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Mac/Linux
kill -9 $(lsof -ti:3000)
```

### PostgreSQL não iniciou
```bash
docker-compose down
docker-compose up -d
docker-compose logs postgres
```

### Erro de migração
```bash
npx prisma migrate reset
npm run db:seed
```

---

## 📚 Próximos Passos

1. **Explorar o Admin**: http://localhost:3000/admin
2. **Testar API de Integração**: [Ver API.md](API.md)
3. **Ler Documentação Completa**: [README.md](README.md)
4. **Entender Arquitetura**: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🎯 Principais Credenciais

| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Dono | dono@loja.com | senha123 | OWNER |
| Gerente | gerente@loja.com | senha123 | ADMIN |
| Cliente | cliente@gmail.com | senha123 | CUSTOMER |

---

**🚀 Happy Coding!**
