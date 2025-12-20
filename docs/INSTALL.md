# 🔧 GUIA DE INSTALAÇÃO RÁPIDA

## Passo a Passo para Rodar o Projeto

### 1. Pré-requisitos
Certifique-se de ter instalado:
- **Node.js 18.17+** ([Download](https://nodejs.org))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com))

### 2. Clone o Projeto
```bash
git clone <seu-repositorio>
cd loja_virtual
```

### 3. Configure o .env
```bash
# No Windows (PowerShell)
copy .env.example .env

# No Mac/Linux
cp .env.example .env
```

Abra o arquivo `.env` e configure:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopping_ferramentas?schema=public"
NEXTAUTH_SECRET="mude-esta-chave-secreta-com-pelo-menos-32-caracteres"
X_INTERNAL_API_KEY="sua-chave-de-integracao-externa"
```

**IMPORTANTE:** Gere uma `NEXTAUTH_SECRET` forte:
```bash
# No terminal (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Inicie o Docker
```bash
docker-compose up -d
```

Aguarde os containers subirem (PostgreSQL + Mailpit).

### 5. Instale as Dependências
```bash
npm install
```

### 6. Configure o Banco de Dados
```bash
# Criar migrations
npx prisma migrate dev --name init

# Popular com dados de exemplo
npm run db:seed
```

### 7. Inicie o Servidor
```bash
npm run dev
```

### 8. Acesse a Aplicação
Abra o navegador em: **http://localhost:3000**

---

## 🎯 Credenciais de Teste

Após rodar o seed, use estas credenciais:

| Usuário | Email | Senha | Permissão |
|---------|-------|-------|-----------|
| **Dono** | dono@loja.com | senha123 | OWNER (Acesso total) |
| **Gerente** | gerente@loja.com | senha123 | ADMIN (Sem financeiro) |
| **Cliente** | cliente@gmail.com | senha123 | CUSTOMER (Loja) |

---

## 📊 Ferramentas Úteis

### Prisma Studio (Visualizar banco)
```bash
npm run db:studio
```
Abre em: http://localhost:5555

### Mailpit (Ver emails de teste)
Abre em: http://localhost:8025

---

## ⚠️ Troubleshooting

### Erro: "Port 5432 already in use"
Outro PostgreSQL está rodando. Pare-o ou mude a porta no `docker-compose.yml`.

### Erro: "Prisma schema not found"
Certifique-se de estar na pasta raiz do projeto (`loja_virtual`).

### Erro: "NEXTAUTH_SECRET not set"
Configure o `.env` corretamente (veja passo 3).

---

## 🚀 Próximos Passos

1. Explore o painel admin: http://localhost:3000/admin
2. Teste as APIs de integração (veja [README.md](README.md#-integrações-apis))
3. Customize o design em `tailwind.config.ts`

---

**Dúvidas?** Consulte a [documentação completa](README.md).
