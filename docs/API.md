# 🚀 API ENDPOINTS REFERENCE

Guia completo de endpoints disponíveis na plataforma Shopping das Ferramentas.

---

## 🔐 Autenticação

Todos os endpoints protegidos requerem sessão válida ou API Key.

### Tipos de Autenticação

| Tipo | Header | Uso |
|------|--------|-----|
| **Session (NextAuth)** | Cookie: `next-auth.session-token` | Rotas de usuário e admin |
| **API Key** | `X-INTERNAL-API-KEY` | Integrações externas |

---

## 📡 Endpoints Públicos

### GET /api/financial/config
Retorna configuração de parcelamento (sem dados sensíveis).

**Response:**
```json
{
  "creditCardInterestRate": 1.99,
  "maxInstallments": 12,
  "minInstallmentValue": 50.00,
  "freeShippingMinValue": 200.00
}
```

---

## 🔌 Endpoints de Integração (API Key Required)

### POST /api/integrations/stock/sync
Sincroniza estoque de fontes externas (ML, Hiper).

**Headers:**
```
X-INTERNAL-API-KEY: sua-chave-secreta
Content-Type: application/json
```

**Request Body:**
```json
{
  "sku": "MAKITA-DHR243Z",
  "quantity": 50,
  "source": "MERCADO_LIVRE",
  "reason": "Venda ML #MLB123456"
}
```

**Response 200:**
```json
{
  "success": true,
  "product": {
    "id": "clx123...",
    "sku": "MAKITA-DHR243Z",
    "name": "Martelete Rotativo Makita",
    "previousStock": 15,
    "newStock": 50,
    "difference": 35
  }
}
```

**Response 404:**
```json
{
  "error": "Produto com SKU MAKITA-DHR243Z não encontrado"
}
```

---

### POST /api/integrations/orders/update-status
Atualiza status de pedido (webhooks de transportadora).

**Request Body:**
```json
{
  "orderNumber": "ORD-2025-000001",
  "status": "SHIPPED",
  "trackingCode": "BR123456789",
  "trackingUrl": "https://rastreio.correios.com.br/..."
}
```

**Response 200:**
```json
{
  "success": true,
  "order": {
    "orderNumber": "ORD-2025-000001",
    "status": "SHIPPED",
    "trackingCode": "BR123456789"
  }
}
```

---

### GET /api/integrations/marketing/abandoned-carts
Lista carrinhos abandonados para remarketing.

**Query Params:**
- `hours` (optional): Horas de abandono (default: 24)

**Example:**
```
GET /api/integrations/marketing/abandoned-carts?hours=48
```

**Response 200:**
```json
{
  "success": true,
  "count": 3,
  "carts": [
    {
      "cartId": "cart_abc123",
      "user": {
        "id": "user_xyz",
        "name": "João Pereira",
        "email": "joao@email.com",
        "phone": "(71) 99999-0003"
      },
      "items": [
        {
          "productName": "Martelete Makita DHR243Z",
          "quantity": 1,
          "price": 1899.00,
          "image": "/products/makita-1.jpg"
        }
      ],
      "total": 1899.00,
      "abandonedAt": "2025-12-10T15:30:00Z"
    }
  ]
}
```

---

## 🛡️ Endpoints Admin (Session Required)

### GET /api/admin/products
Lista produtos com paginação e busca.

**Auth:** ADMIN ou OWNER

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional)

**Example:**
```
GET /api/admin/products?page=1&limit=20&search=makita
```

**Response 200:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "sku": "MAKITA-DHR243Z",
      "name": "Martelete Rotativo Makita",
      "price": 1899.00,
      "stock": 15,
      "category": {
        "name": "Furadeiras"
      },
      "images": [
        { "url": "/products/makita-1.jpg" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### POST /api/admin/products
Cria novo produto.

**Auth:** ADMIN ou OWNER

**Request Body:**
```json
{
  "sku": "BOSCH-GBH-2-28",
  "name": "Martelete Bosch GBH 2-28",
  "price": 1450.00,
  "stock": 10,
  "categoryId": "cat_123",
  "stockLocation": "Corredor A - Prateleira 5",
  "specs": {
    "voltagem": "220V",
    "potencia": "880W"
  }
}
```

**Response 201:**
```json
{
  "id": "prod_new123",
  "sku": "BOSCH-GBH-2-28",
  "slug": "martelete-bosch-gbh-2-28",
  "name": "Martelete Bosch GBH 2-28",
  "price": 1450.00,
  "createdAt": "2025-12-12T10:30:00Z"
}
```

---

### GET /api/admin/financial/config
Retorna configuração financeira completa (incluindo markup).

**Auth:** OWNER apenas

**Response 200:**
```json
{
  "id": "singleton",
  "creditCardInterestRate": 1.99,
  "debitCardInterestRate": 0,
  "maxInstallments": 12,
  "minInstallmentValue": 50.00,
  "freeShippingMinValue": 200.00,
  "defaultMarkupPercentage": 30.0,
  "updatedAt": "2025-12-01T12:00:00Z",
  "updatedBy": "owner_user_id"
}
```

---

### PUT /api/admin/financial/config
Atualiza configuração financeira.

**Auth:** OWNER apenas

**Request Body:**
```json
{
  "creditCardInterestRate": 2.49,
  "maxInstallments": 10,
  "minInstallmentValue": 60.00
}
```

**Response 200:**
```json
{
  "id": "singleton",
  "creditCardInterestRate": 2.49,
  "maxInstallments": 10,
  "minInstallmentValue": 60.00,
  "updatedAt": "2025-12-12T14:30:00Z"
}
```

---

## ⚠️ Códigos de Status HTTP

| Status | Significado |
|--------|-------------|
| **200** | Sucesso |
| **201** | Criado com sucesso |
| **400** | Dados inválidos (Zod validation error) |
| **401** | Não autenticado (API Key ou Session inválida) |
| **403** | Sem permissão (Role insuficiente) |
| **404** | Recurso não encontrado |
| **500** | Erro interno do servidor |

---

## 🧪 Exemplos de Uso (cURL)

### Sincronizar Estoque
```bash
curl -X POST http://localhost:3000/api/integrations/stock/sync \
  -H "X-INTERNAL-API-KEY: sua-chave-secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "MAKITA-DHR243Z",
    "quantity": 100,
    "source": "MERCADO_LIVRE"
  }'
```

### Criar Produto (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "Cookie: next-auth.session-token=SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "DEWALT-DCD996",
    "name": "Furadeira DeWalt DCD996",
    "price": 1549.00,
    "stock": 8,
    "categoryId": "cat_furadeiras"
  }'
```

---

## 📚 Documentação Adicional

- [README.md](README.md) - Visão geral do projeto
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura detalhada
- [INSTALL.md](INSTALL.md) - Guia de instalação

---

**Última atualização:** 12 de dezembro de 2025
