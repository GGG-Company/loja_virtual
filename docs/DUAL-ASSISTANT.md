# 🤖 Sistema de Assistentes Virtuais - Dual Mode

## Visão Geral

O sistema agora possui **2 assistentes virtuais** que você pode alternar:

1. **Smart Assistant** (Padrão) - `/api/assistant`
   - Respostas rápidas e estruturadas
   - Baseado em regras e busca no banco de dados
   - Não requer API externa
   - Zero custo operacional

2. **AI Assistant** (OpenAI) - `/api/assistant-ai`
   - Respostas naturais e contextuais
   - Powered by GPT-4o-mini
   - Conversação mais humana
   - Requer OPENAI_API_KEY

---

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione no arquivo `.env`:

```bash
# AI Assistant (OpenAI)
OPENAI_API_KEY="sua-chave-aqui"  # Opcional
```

**Obter chave da OpenAI:**
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave
3. Cole no `.env`

### 2. Instalação

O pacote OpenAI já foi instalado:
```bash
npm install openai --legacy-peer-deps
```

---

## 🎯 Como Usar

### No Frontend (Interface do Chat)

1. **Abrir o Chat**: Clique no botão flutuante (canto inferior direito)

2. **Trocar Modo**: 
   - Clique no ícone de **engrenagem** (⚙️) no header
   - Escolha entre:
     - **Smart (Padrão)** - Ícone azul 🤖
     - **IA (OpenAI)** - Ícone roxo ✨

3. **Identificação Visual**:
   - **Modo Smart**: Botão azul, ícone de chat
   - **Modo IA**: Botão roxo, ícone de estrela (Sparkles)
   - Mensagens com IA mostram badge "Powered by AI"

### Via API

#### Smart Assistant
```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"question": "quero uma furadeira Makita"}'
```

#### AI Assistant
```bash
curl -X POST http://localhost:3000/api/assistant-ai \
  -H "Content-Type: application/json" \
  -d '{"question": "me explique como escolher uma furadeira"}'
```

---

## 📊 Comparação dos Assistentes

| Recurso | Smart Assistant | AI Assistant |
|---------|----------------|--------------|
| **Velocidade** | ⚡ Muito rápida | 🐌 2-5 segundos |
| **Custo** | 💰 Grátis | 💸 $0.15-0.60/1M tokens |
| **Conversação** | ❌ Respostas predefinidas | ✅ Natural e contextual |
| **Produtos** | ✅ Busca precisa | ✅ Busca + explicação |
| **Explicações** | ❌ Limitadas | ✅ Detalhadas |
| **Configuração** | ✅ Zero setup | ⚠️ Requer API Key |
| **Segurança** | ✅ 100% seguro | ✅ 100% seguro |
| **Offline** | ✅ Funciona sempre | ❌ Precisa internet |

---

## 🔐 Segurança

**Ambos os assistentes têm as mesmas proteções:**

✅ Bloqueio de dados sensíveis  
✅ Detecção de tentativas de manipulação  
✅ Sanitização de inputs  
✅ Contexto controlado  
✅ Respostas validadas  

**No AI Assistant:**
- System prompt protegido
- Temperatura baixa (0.7) para respostas consistentes
- Max tokens limitado (500)
- Contexto fornecido de forma segura

---

## 💡 Quando Usar Cada Um?

### Use **Smart Assistant** quando:
- ✅ Cliente quer buscar produtos rapidamente
- ✅ Perguntas sobre informações da loja
- ✅ Orçamento limitado
- ✅ Precisa de respostas instantâneas

### Use **AI Assistant** quando:
- ✅ Cliente faz perguntas complexas
- ✅ Precisa de explicações detalhadas
- ✅ Conversação mais natural é importante
- ✅ Orçamento permite uso de API

---

## 🔄 Fallback Automático

Se o **AI Assistant** não estiver configurado (sem API key):

1. Cliente tenta usar modo IA
2. Sistema detecta erro 503
3. Faz fallback automático para Smart Assistant
4. Mostra mensagem: "⚠️ IA não configurada. Usando assistente padrão"

---

## 📝 Exemplos de Uso

### Smart Assistant - Busca de Produtos
```
👤 "quero uma furadeira"
🤖 "Encontrei 3 produto(s):

**Furadeira Makita HP333D** R$ 299.90 - 15 em estoque
**Furadeira Bosch GSB 450** R$ 189.90 - 8 em estoque
**Parafusadeira Furadeira DeWalt** R$ 450.00 - 12 em estoque"
```

### AI Assistant - Consultoria
```
👤 "qual a diferença entre furadeira de impacto e comum?"
🤖✨ "Ótima pergunta! A furadeira de impacto possui um mecanismo que 
adiciona pequenos golpes (impactos) enquanto gira, ideal para furar 
alvenaria, concreto e materiais duros. Já a furadeira comum faz apenas 
o movimento rotativo, sendo melhor para madeira, metal e plástico.

Para obras, recomendo a **Furadeira de Impacto Makita HP333D** que 
temos em estoque, ela tem modo de impacto e modo normal, sendo 2 em 1!"
```

---

## 🛠️ Arquitetura Técnica

### Smart Assistant (`/api/assistant/route.ts`)
```typescript
Pergunta → Sanitização → Validação → Busca BD → Resposta Estruturada
```

### AI Assistant (`/api/assistant-ai/route.ts`)
```typescript
Pergunta → Sanitização → Validação → Contexto BD → OpenAI → Resposta IA
```

### Frontend (`/components/chat-assistant.tsx`)
```typescript
Estado: assistantMode = 'smart' | 'ai'
Endpoint: assistantMode === 'ai' ? '/api/assistant-ai' : '/api/assistant'
```

---

## 💰 Estimativa de Custos (AI Assistant)

**Modelo**: GPT-4o-mini

| Uso | Tokens/msg | Custo/msg | Custo/1000 msgs |
|-----|-----------|-----------|-----------------|
| Busca simples | ~300 | $0.000045 | $0.045 |
| Consulta média | ~500 | $0.000075 | $0.075 |
| Conversa longa | ~800 | $0.00012 | $0.12 |

**Exemplo**: 10.000 mensagens/mês ≈ $0.75 - $1.20/mês

---

## 🔍 Monitoramento

### Logs do Smart Assistant
```typescript
console.error('[ASSISTANT]', error);
```

### Logs do AI Assistant
```typescript
console.error('[ASSISTANT AI ERROR]', error);
console.log('[AI RESPONSE]', { model, tokens, cost });
```

---

## 🚀 Roadmap Futuro

- [ ] Rate limiting por usuário
- [ ] Histórico de conversas
- [ ] Analytics de uso
- [ ] Modo híbrido (Smart + IA)
- [ ] A/B testing automático
- [ ] Fine-tuning do modelo

---

## 📞 Troubleshooting

### IA não funciona
```bash
# Verifique se a chave está configurada
echo $OPENAI_API_KEY

# Teste a API diretamente
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Erro 401 (OpenAI)
- API Key inválida ou expirada
- Verifique em: https://platform.openai.com/api-keys

### Erro 429 (Rate Limit)
- Limite de requisições atingido
- Aguarde alguns segundos
- Considere upgrade do plano OpenAI

---

**Última atualização**: 14 de Janeiro de 2026  
**Versão**: 3.0 - Dual Assistant System
