# Conformidade LGPD

Documentação técnica dos 7 pilares de conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).

---

## Status de Implementação

| Pilar | Status | Onde |
|-------|--------|------|
| Consentimento de Cookies | ✅ Implementado | `src/components/cookie-consent.tsx` |
| Acesso e Portabilidade | ✅ Implementado | `GET /api/user/export` |
| Direito ao Esquecimento | ✅ Implementado | `DELETE /api/user/account` |
| Política de Privacidade | ✅ Implementado | `/privacidade` |
| Termos de Uso | ✅ Implementado | `/termos` |
| Encarregado de Dados (DPO) | ✅ Declarado | `/privacidade` — dpo@shopferramentas.com.br |
| Segurança em Trânsito | ✅ Implementado | HTTPS/TLS + HSTS |
| Segurança em Repouso | ⚠️ Configuração manual | Ver seção abaixo |
| Ressurreição por Backup | ✅ Mitigado | `src/lib/deletion-registry.ts` + `scripts/reconcile-deletions.mjs` |
| Logs sem dados pessoais | ✅ Corrigido | `src/lib/logger.ts` + `process/route.ts` |

---

## 1. Consentimento de Cookies

**Arquivo**: `src/components/cookie-consent.tsx`  
**Integrado em**: `src/app/layout.tsx` — carrega em todas as páginas.

Três categorias de consentimento:
- **Essenciais** — sempre ativos (sessão, autenticação). Não requerem consentimento.
- **Analíticos** — métricas de uso (Google Analytics, etc.). Bloqueados até aceite.
- **Marketing** — rastreamento e remarketing. Bloqueados até aceite.

O estado é salvo em `localStorage` com chave `lgpd_consent`, incluindo timestamp do aceite.  
Um evento customizado `consentUpdated` é disparado para outros componentes lerem o estado via `useCookieConsent()`.

**Registro de consentimento** (para auditoria futura, salvar no banco):
```ts
// Exemplo de como expandir para persistir o consentimento no servidor:
// POST /api/user/consent { analytics: true, marketing: false, acceptedAt: ISO }
```

---

## 2. Portabilidade de Dados — Art. 18, V

**Rota**: `GET /api/user/export`  
**Arquivo**: `src/app/api/user/export/route.ts`

Dados exportados:
- Perfil completo (nome, e-mail, telefone, CPF mascarado, endereço, data de nascimento)
- Todos os pedidos com itens
- Todas as devoluções com itens
- Avaliações de produtos
- Histórico de atividade (últimas 200 entradas)

Retorna arquivo JSON com header `Content-Disposition: attachment`.  
CPF é mascarado (`***.***.***-XX`) no export — o CPF completo só é fornecido via solicitação formal.

**Ponto de acesso para o usuário**: `/minha-conta` → aba Perfil → seção "Privacidade e Seus Dados" → botão "Exportar Meus Dados".

---

## 3. Direito ao Esquecimento / Anonimização — Art. 18, VI

**Rota**: `DELETE /api/user/account`  
**Arquivo**: `src/app/api/user/account/route.ts`

A exclusão aplica **anonimização** (não hard delete) para preservar integridade referencial dos pedidos:

| Campo | Antes | Depois |
|-------|-------|--------|
| `name` | "João Silva" | "Usuário Removido" |
| `email` | "joao@email.com" | `deleted_<userId>@removed.invalid` |
| `password` | hash bcrypt | `null` |
| `phone`, `cpf`, `cnpj` | dados reais | `null` |
| `addressZip` … `addressState` | dados reais | `null` |
| `birthDate` | data real | `null` |
| `image` | URL | `null` |
| `deletedAt` | `null` | timestamp atual |
| `tokenVersion` | N | N+1 (invalida todos os JWTs ativos) |

Sessões OAuth (Google) são deletadas via `account.deleteMany`.  
Pedidos e itens de pedido **são mantidos** com `userId` preservado — apenas sem dados pessoais vinculados.

**Ponto de acesso para o usuário**: `/minha-conta` → aba Perfil → seção "Excluir Minha Conta" → confirmação digitando `EXCLUIR`.

---

## 4. Segurança em Trânsito (TLS)

Já implementado via Nginx:
- HTTPS obrigatório em produção
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS) via `next.config.mjs`
- Certificados gerenciados pelo CloudPanel

---

## 5. Segurança em Repouso — Dados Sensíveis

### Campos sensíveis no banco (PostgreSQL)

| Tabela | Campos sensíveis |
|--------|-----------------|
| `users` | `email`, `password` (bcrypt), `cpf`, `cnpj`, `phone`, `birth_date`, `address_*` |
| `orders` | `shipping_address` (JSON com nome e endereço completo) |
| `returns` | `reason_details`, `image_url` |
| `mercado_pago_config` | `access_token`, `webhook_secret` |
| `melhor_envio_token` | `access_token`, `refresh_token` |

### Opção A — Criptografia a nível de coluna (pgcrypto)

```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Exemplo: criptografar CPF com AES-256
UPDATE users
SET cpf = encode(encrypt(cpf::bytea, 'sua-chave-32-bytes'::bytea, 'aes'), 'hex')
WHERE cpf IS NOT NULL;

-- Leitura:
SELECT encode(decrypt(decode(cpf, 'hex'), 'sua-chave-32-bytes'::bytea, 'aes'), 'escape')
FROM users WHERE id = $1;
```

> A chave de criptografia deve ser armazenada em variável de ambiente (`DB_ENCRYPTION_KEY`), nunca no banco.

### Opção B — Criptografia a nível de disco (recomendada para produção)

Se usando servidor dedicado ou VPS, habilitar **LUKS** (Linux) para criptografar o volume do PostgreSQL:

```bash
# Checar se o volume já está criptografado
lsblk -o NAME,FSTYPE,MOUNTPOINT

# Verificar configuração de data_directory do Postgres
sudo -u postgres psql -c "SHOW data_directory;"
```

No CloudPanel/VPS já provisionado, solicitar ao provedor (AWS, DigitalOcean, etc.) ativar **encrypted volumes** nas configurações da instância — sem necessidade de migração manual.

### Opção C — Transparent Data Encryption via PostgreSQL 16+

PostgreSQL 17 introduz TDE nativo. Para versões anteriores, usar **Timescale** ou **Crunchy Data** que oferecem TDE como extensão.

### Recomendação atual

Para o porte deste projeto, a prioridade é:
1. ✅ TLS em trânsito (já implementado)
2. ✅ Bcrypt para senhas (já implementado — salt rounds 10)
3. ✅ CPF mascarado em respostas de API (já implementado)
4. ⚙️ Encrypted volume no servidor (configurar no provedor de hospedagem)
5. ⚙️ `pgcrypto` para CPF/telefone se o banco for compartilhado

---

## 6. Encarregado de Dados (DPO) — Art. 41

Designado na página `/privacidade`:
- **Contato**: dpo@shopferramentas.com.br
- **SLA de resposta**: 15 dias úteis (conforme Art. 18, §3º)

---

## 7. Ressurreição por Backup — Mitigação

### O problema

Um usuário solicita exclusão hoje. O banco é restaurado de um backup de ontem. O usuário "ressuscita" com todos os dados pessoais intactos — `deletedAt` volta a NULL, nome e e-mail voltam aos originais.

### Solução implementada

**Arquivo:** `src/lib/deletion-registry.ts`

A cada exclusão de conta, além de anonimizar no banco, o sistema grava uma entrada num arquivo JSON Lines (`deletion-registry.jsonl`) fora do volume do PostgreSQL:

```jsonl
{"userId":"clxyz...","deletedAt":"2026-04-03T15:00:00.000Z"}
```

Configurar via env (deve apontar para volume separado do Postgres):
```env
DELETION_REGISTRY_PATH=/var/log/app/deletion-registry.jsonl
```

**Script de reconciliação:** `scripts/reconcile-deletions.mjs`

Após qualquer restauração de backup, executar obrigatoriamente:

```bash
DELETION_REGISTRY_PATH=/var/log/app/deletion-registry.jsonl \
DATABASE_URL="postgresql://..." \
node scripts/reconcile-deletions.mjs
```

O script lê o registro, identifica usuários que voltaram ao estado ativo e re-anonimiza.

### Checklist operacional pós-restauração

1. Restaurar backup do PostgreSQL normalmente
2. Verificar que o arquivo `deletion-registry.jsonl` está íntegro (está num volume separado)
3. Executar `node scripts/reconcile-deletions.mjs`
4. Confirmar saída: `Re-anonimizados: N`
5. Registrar a ocorrência no ROPA

> **Nota de infraestrutura:** O arquivo de registro deve estar num volume/partição diferente do `data_directory` do Postgres. Em produção VPS/CloudPanel, usar um diretório fora do Docker volume do banco, como `/var/log/app/`.

---

## 8. Segurança em Logs de Aplicação

### O que está protegido

O logger (`src/lib/logger.ts`) usa `pino` com `redact` ativo. Campos sensíveis são substituídos por `[REDACTED]` antes de qualquer escrita em disco ou stdout.

Campos redactados:
- `email`, `*.email`, `userEmail`
- `cpf`, `*.cpf`
- `phone`, `*.phone`, `*.telefone`
- `password`, `*.password`
- `shippingAddress.name/zip/street/phone/cpf`
- `to.postal_code`, `from.postal_code`
- `token`, `*.token` (token de cartão Mercado Pago)
- `userCpf`, `*.userCpf`, `identificationNumber`
- `*.payer.email`, `*.payer.identification.number` (dados do pagador)

### Vulnerabilidade corrigida

**`src/app/api/payments/mercadopago/process/route.ts`** continha:

```ts
// ANTES (vulnerável) — logava CPF e token do cartão em texto plano
logger.warn({ body }, 'Tentativa de pagamento com dados ausentes');

// DEPOIS (corrigido) — apenas identificadores seguros
logger.warn({ orderId, amount }, 'Tentativa de pagamento com dados ausentes');
```

O `body` neste contexto continha `formData.payer.identification.number` (CPF) e `formData.token` (token do cartão). O redact do pino não alcançava esse nível de aninhamento sem os novos caminhos adicionados.

### Auditoria de logs existentes

Se o projeto esteve em produção antes desta correção, verificar os logs de aplicação com:

```bash
grep -n "dados ausentes" /var/log/app/*.log
```

Qualquer entrada anterior a este commit pode conter dados de pagamento. Esses arquivos de log devem ser apagados (ou truncados após backup seguro) e o período de retenção redefinido.

---

## 9. Registros de Operações (ROPA)

O sistema registra todas as operações relevantes via `ActivityLog`:
- `DATA_EXPORTED` — quando o usuário exporta seus dados
- `ACCOUNT_DELETED` — quando a conta é anonimizada
- Ações administrativas sobre pedidos, devoluções e produtos

Para conformidade completa, o `ActivityLog` serve como base do **ROPA** (Record of Processing Activities).

---

## Referências

- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd)
- [OWASP Top 10 Privacy Risks](https://owasp.org/www-project-top-10-privacy-risks/)
