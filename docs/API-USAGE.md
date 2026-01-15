# 📖 Documentação da API - Shopping das Ferramentas

## 🌐 Acesso à Documentação Interativa

A documentação completa da API está disponível através do **Scalar**, uma interface moderna e interativa para explorar e testar endpoints.

### 🚀 Como Acessar

**Desenvolvimento:**
```
http://localhost:3000/api/docs
```

**Produção:**
```
https://loja.azura.dev.br
```

---

## 📋 Especificação OpenAPI

A especificação completa da API em formato OpenAPI 3.1 está disponível em:

```
/openapi.json
```

Você pode importar este arquivo em ferramentas como:
- Postman
- Insomnia
- Swagger UI
- Bruno
- HTTPie

---

## 🔑 Autenticação

A API utiliza dois métodos de autenticação:

### 1️⃣ Autenticação por Sessão (NextAuth)

Para endpoints de usuário e admin, utilize o cookie de sessão:

```http
Cookie: next-auth.session-token=SEU_TOKEN_AQUI
```

**Como obter:**
1. Faça login através da interface web em `/auth/login`
2. O cookie será automaticamente configurado
3. Use o mesmo navegador para fazer requisições

### 2️⃣ API Key (Integrações)

Para integrações externas e webhooks:

```http
X-INTERNAL-API-KEY: sua-chave-secreta-aqui
```

**Como configurar:**
Configure a variável de ambiente `INTERNAL_API_KEY` no arquivo `.env`

---

## 📡 Exemplos de Uso

### Listar Produtos

**Request:**
```bash
curl -X GET "http://localhost:3000/api/products?page=1&limit=20" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "products": [
    {
      "id": "clx123abc",
      "name": "Furadeira de Impacto Bosch 650W",
      "price": 299.99,
      "promotionalPrice": 249.99,
      "stock": 50,
      "imageUrl": "/products/furadeira-bosch.jpg"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

---

### Buscar Produto por ID

**Request:**
```bash
curl -X GET "http://localhost:3000/api/products/clx123abc" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "id": "clx123abc",
  "name": "Furadeira de Impacto Bosch 650W",
  "description": "Furadeira profissional com 650W de potência...",
  "price": 299.99,
  "promotionalPrice": 249.99,
  "stock": 50,
  "sku": "BOSCH-GSB-650",
  "category": {
    "id": "cat123",
    "name": "Ferramentas Elétricas",
    "slug": "ferramentas-eletricas"
  }
}
```

---

### Calcular Frete

**Request:**
```bash
curl -X POST "http://localhost:3000/api/shipping/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "cep": "01310-100",
    "items": [
      {
        "productId": "clx123abc",
        "quantity": 2
      }
    ]
  }'
```

**Response:**
```json
[
  {
    "service": "SEDEX",
    "price": 25.50,
    "deliveryTime": 3
  },
  {
    "service": "PAC",
    "price": 15.80,
    "deliveryTime": 7
  }
]
```

---

### Criar Pedido

**Request:**
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "clx123abc",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "street": "Av. Paulista",
      "number": "1000",
      "complement": "Apto 101",
      "neighborhood": "Bela Vista",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310-100"
    },
    "paymentMethod": "PIX"
  }'
```

**Response:**
```json
{
  "id": "order123",
  "orderNumber": "ORD-2026-000001",
  "status": "PENDING",
  "total": 599.99,
  "paymentMethod": "PIX"
}
```

---

### Gerar Pagamento PIX

**Request:**
```bash
curl -X POST "http://localhost:3000/api/payments/mercadopago/pix" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN" \
  -d '{
    "orderId": "order123"
  }'
```

**Response:**
```json
{
  "qrCode": "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d3-a456-426655440000...",
  "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "paymentId": "987654321",
  "expiresAt": "2026-01-14T15:30:00Z"
}
```

---

### Criar Avaliação de Produto

**Request:**
```bash
curl -X POST "http://localhost:3000/api/products/clx123abc/reviews" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN" \
  -d '{
    "rating": 5,
    "comment": "Produto excelente, superou expectativas!"
  }'
```

**Response:**
```json
{
  "id": "review123",
  "rating": 5,
  "comment": "Produto excelente, superou expectativas!",
  "verified": true,
  "createdAt": "2026-01-14T10:30:00Z"
}
```

---

### Sincronizar Estoque (API Key)

**Request:**
```bash
curl -X POST "http://localhost:3000/api/integrations/stock/sync" \
  -H "Content-Type: application/json" \
  -H "X-INTERNAL-API-KEY: sua-chave-secreta" \
  -d '{
    "sku": "MAKITA-DHR243Z",
    "quantity": 45,
    "source": "MERCADO_LIVRE",
    "reason": "Venda ML #MLB123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "prod123",
    "sku": "MAKITA-DHR243Z",
    "name": "Martelete Rotativo Makita",
    "previousStock": 50,
    "newStock": 45,
    "difference": -5
  }
}
```

---

### Solicitar Devolução

**Request:**
```bash
curl -X POST "http://localhost:3000/api/returns" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN" \
  -d '{
    "orderId": "order123",
    "reason": "DEFECTIVE",
    "description": "Produto chegou com defeito na embalagem"
  }'
```

**Response:**
```json
{
  "id": "return123",
  "orderId": "order123",
  "status": "PENDING",
  "reason": "DEFECTIVE",
  "description": "Produto chegou com defeito na embalagem",
  "createdAt": "2026-01-14T10:30:00Z"
}
```

---

### Obter Perfil do Usuário

**Request:**
```bash
curl -X GET "http://localhost:3000/api/profile" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN"
```

**Response:**
```json
{
  "id": "user123",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "(11) 98765-4321",
  "cpf": "123.456.789-00"
}
```

---

## 🔧 Exemplos com JavaScript/TypeScript

### Usando Fetch API

```typescript
// Listar produtos
const response = await fetch('http://localhost:3000/api/products?page=1&limit=20');
const data = await response.json();
console.log(data.products);

// Criar pedido (autenticado)
const order = await fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Inclui cookies de sessão
  body: JSON.stringify({
    items: [
      { productId: 'clx123abc', quantity: 2 }
    ],
    shippingAddress: {
      street: 'Av. Paulista',
      number: '1000',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100'
    },
    paymentMethod: 'PIX'
  })
});

const orderData = await order.json();
```

### Usando Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true, // Inclui cookies
});

// Buscar produto
const product = await api.get('/products/clx123abc');

// Calcular frete
const shipping = await api.post('/shipping/quote', {
  cep: '01310-100',
  items: [{ productId: 'clx123abc', quantity: 2 }]
});

// Sincronização com API Key
const syncStock = await api.post('/integrations/stock/sync', 
  {
    sku: 'MAKITA-DHR243Z',
    quantity: 45,
    source: 'MERCADO_LIVRE'
  },
  {
    headers: {
      'X-INTERNAL-API-KEY': 'sua-chave-secreta'
    }
  }
);
```

---

## 🐍 Exemplo com Python

```python
import requests

# Configuração
API_URL = "http://localhost:3000/api"
API_KEY = "sua-chave-secreta"

# Listar produtos
response = requests.get(f"{API_URL}/products", params={"page": 1, "limit": 20})
products = response.json()

# Sincronizar estoque
headers = {
    "Content-Type": "application/json",
    "X-INTERNAL-API-KEY": API_KEY
}

data = {
    "sku": "MAKITA-DHR243Z",
    "quantity": 45,
    "source": "MERCADO_LIVRE",
    "reason": "Venda ML #MLB123456"
}

response = requests.post(
    f"{API_URL}/integrations/stock/sync",
    json=data,
    headers=headers
)

result = response.json()
print(f"Estoque atualizado: {result}")
```

---

## 📱 Testando com Postman

1. Importe o arquivo OpenAPI:
   - Abra o Postman
   - Clique em **Import**
   - Cole a URL: `http://localhost:3000/openapi.json`
   - Clique em **Import**

2. Configure a autenticação:
   - Para endpoints com sessão: adicione o cookie manualmente
   - Para endpoints com API Key: adicione o header `X-INTERNAL-API-KEY`

3. Explore e teste todos os endpoints diretamente!

---

## ⚡ Respostas de Erro Comuns

### 400 Bad Request
```json
{
  "error": "Dados inválidos",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized
```json
{
  "error": "Autenticação necessária",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found
```json
{
  "error": "Recurso não encontrado",
  "code": "NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "error": "Erro interno do servidor",
  "code": "INTERNAL_ERROR"
}
```

---

## 🎯 Principais Endpoints

| Endpoint | Método | Autenticação | Descrição |
|----------|--------|--------------|-----------|
| `/api/products` | GET | Não | Lista produtos com filtros |
| `/api/products/{id}` | GET | Não | Detalhes de um produto |
| `/api/categories` | GET | Não | Lista categorias |
| `/api/shipping/quote` | POST | Não | Calcula frete |
| `/api/orders` | POST | Sessão | Cria novo pedido |
| `/api/user/orders` | GET | Sessão | Lista pedidos do usuário |
| `/api/payments/mercadopago/pix` | POST | Sessão | Gera pagamento PIX |
| `/api/products/{id}/reviews` | POST | Sessão | Cria avaliação |
| `/api/returns` | POST | Sessão | Solicita devolução |
| `/api/profile` | GET/PUT | Sessão | Gerencia perfil |
| `/api/integrations/stock/sync` | POST | API Key | Sincroniza estoque |
| `/api/admin/products` | GET/POST | Admin | CRUD de produtos |
| `/api/admin/stats` | GET | Admin | Estatísticas da loja |

---

## � Webhooks para N8N

A aplicação envia webhooks automaticamente para o n8n quando certos eventos ocorrem. Configure a URL do webhook nas variáveis de ambiente:

```env
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/sua-chave
# ou específico para pedidos:
N8N_ORDERS_WEBHOOK_URL=https://seu-n8n.com/webhook/orders
```

### Eventos de Webhook

#### 1️⃣ Atualização de Status de Pedido

**Evento:** `order.status.update`

**Quando é enviado:**
- Pedido criado
- Pagamento confirmado
- Pedido em processamento
- Pedido enviado
- Pedido entregue
- Pedido cancelado

**Payload:**
```json
{
  "type": "order.status.update",
  "timestamp": "2026-01-14T10:30:00Z",
  "orderId": "clx123abc",
  "orderNumber": "ORD-2026-000001",
  "status": "SHIPPED",
  "total": 599.99,
  "user": {
    "id": "user123",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 98765-4321"
  },
  "trackingCode": "BR123456789",
  "trackingUrl": "https://rastreio.correios.com.br/app/index.php",
  "paymentMethod": "PIX",
  "shippedAt": "2026-01-14T15:00:00Z",
  "items": [
    {
      "productId": "prod123",
      "quantity": 2,
      "price": 299.99,
      "product": {
        "name": "Furadeira Bosch",
        "sku": "BOSCH-GSB-650"
      }
    }
  ]
}
```

#### 2️⃣ Devolução Criada

**Evento:** `returns.created`

**Quando é enviado:** Cliente solicita devolução de produto

**Payload:**
```json
{
  "type": "returns.created",
  "timestamp": "2026-01-14T10:30:00Z",
  "returnId": "return123",
  "orderId": "order123",
  "orderNumber": "ORD-2026-000001",
  "reason": "DEFECTIVE",
  "status": "PENDING",
  "description": "Produto chegou com defeito",
  "user": {
    "name": "João Silva",
    "email": "joao@email.com"
  }
}
```

#### 3️⃣ Devolução Aprovada

**Evento:** `returns.approved`

**Quando é enviado:** Admin aprova uma solicitação de devolução

**Payload:**
```json
{
  "type": "returns.approved",
  "timestamp": "2026-01-14T11:00:00Z",
  "returnId": "return123",
  "orderId": "order123",
  "orderNumber": "ORD-2026-000001"
}
```

#### 4️⃣ Devolução Rejeitada

**Evento:** `returns.rejected`

**Quando é enviado:** Admin rejeita uma solicitação de devolução

**Payload:**
```json
{
  "type": "returns.rejected",
  "timestamp": "2026-01-14T11:00:00Z",
  "returnId": "return123",
  "orderId": "order123",
  "reason": "Produto sem defeito aparente"
}
```

#### 5️⃣ Etiqueta de Envio Pronta

**Evento:** `shipping.label_ready`

**Quando é enviado:** Etiqueta de envio é gerada

**Payload:**
```json
{
  "type": "shipping.label_ready",
  "timestamp": "2026-01-14T14:00:00Z",
  "orderId": "order123",
  "orderNumber": "ORD-2026-000001",
  "labelUrl": "https://melhorenvio.com.br/labels/123.pdf",
  "trackingCode": "BR123456789"
}
```

### Configurando Webhook no N8N

**Passo 1:** Crie um workflow no n8n

**Passo 2:** Adicione um nó "Webhook"

**Passo 3:** Configure o nó:
- **HTTP Method:** POST
- **Path:** /webhook/sua-chave (personalize)
- **Authentication:** None (ou configure Basic Auth se preferir)

**Passo 4:** Copie a URL do webhook

**Passo 5:** Configure no arquivo `.env`:
```env
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/sua-chave
```

**Exemplo de Workflow N8N:**

```
[Webhook] → [Switch (por tipo de evento)] → [Ações específicas]
                ├─ order.status.update → [Enviar email]
                ├─ returns.created → [Notificar admin]
                ├─ returns.approved → [Processar reembolso]
                └─ shipping.label_ready → [Atualizar sistema]
```

### Testando Webhooks

Você pode testar o envio de webhooks usando o endpoint de teste (apenas em desenvolvimento):

```bash
curl -X POST "http://localhost:3000/api/admin/integrations/webhook/test" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN"
```

### Status dos Pedidos

Os possíveis status enviados nos webhooks são:

| Status | Descrição |
|--------|-----------|
| `PENDING` | Pedido criado, aguardando pagamento |
| `CONFIRMED` | Pagamento confirmado |
| `PROCESSING` | Em separação/preparação |
| `SHIPPED` | Enviado para transporte |
| `DELIVERED` | Entregue ao cliente |
| `CANCELLED` | Cancelado |
| `REFUNDED` | Reembolsado |
| `QUOTE` | Cotação/orçamento |

### Motivos de Devolução

| Código | Descrição |
|--------|-----------|
| `DEFECTIVE` | Produto com defeito |
| `WRONG_PRODUCT` | Produto errado |
| `NOT_AS_DESCRIBED` | Não conforme descrição |
| `CHANGED_MIND` | Desistência |

---

## 🔗 Links Úteis

- **Documentação Interativa:** `/api/docs`
- **Especificação OpenAPI:** `/openapi.json`
- **Documentação Scalar:** https://github.com/scalar/scalar
- **OpenAPI Specification:** https://spec.openapis.org/oas/v3.1.0
- **N8N Documentation:** https://docs.n8n.io/

---

## 📞 Suporte

Para dúvidas sobre a API, entre em contato:
- Email: suporte@shoppingdasferramentas.com
- Documentação completa: `/docs`

---

**Última atualização:** 14/01/2026

