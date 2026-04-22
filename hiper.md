# Integração Hiper Gestão — Referência Técnica

> API REST da Hiper para integração com loja virtual.  
> Base URL: `https://ms-ecommerce.hiper.com.br/api/v1`

---

## Sumário

1. [Autenticação](#autenticação)
2. [Produtos](#produtos)
3. [Estoque](#estoque)
4. [Pedido de Venda — Criar](#pedido-de-venda--criar)
5. [Pedido de Venda — Consultar](#pedido-de-venda--consultar)
6. [Pedido de Venda — Cancelar](#pedido-de-venda--cancelar)
7. [Códigos de Status HTTP](#códigos-de-status-http)
8. [IDs dos Meios de Pagamento](#ids-dos-meios-de-pagamento)

---

## Autenticação

**`GET /auth/gerar-token/{chaveDeSeguranca}`**

A chave de segurança é gerada automaticamente após a contratação do app "Loja Virtual".  
Para consultar: Hiper Gestão → Vendas → Loja Virtual.

### Resposta

```json
{
  "chaveDeSeguranca": "31ccdc335b8a6825e28e032a4906fe5dd446ec9e99878012d66b8c77e066f0b9",
  "token": "eyJhbGci...",
  "errors": [],
  "message": null
}
```

### Uso nos demais endpoints

```
Authorization: Bearer {token}
```

> O token expira em ~6h. A integração local renova automaticamente com 30 min de antecedência.

---

## Produtos

**`GET /produtos/pontoDeSincronizacao?pontoDeSincronizacao={n}`**

Retorna todos os produtos configurados para a loja virtual a partir do ponto de sincronização informado.  
Use `0` para buscar todos. Use o valor retornado em `pontoDeSincronizacao` para buscas incrementais.

### Campos retornados por produto

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador único do produto no Hiper |
| `nome` | string (60) | Nome do produto ou grade |
| `codigo` | int | Código interno no Hiper |
| `codigoDeBarras` | string (36) | EAN / código de barras |
| `descricao` | string (700) | Descrição detalhada |
| `marca` | string (60) | Nome da marca |
| `categoria` | string (40) | Nome da categoria |
| `categoriaDoProdutoId` | uuid | ID da categoria |
| `preco` | decimal | Preço de venda |
| `quantidadeEmEstoque` | decimal | Estoque atual |
| `quantidadeMinimaEmEstoque` | decimal | Estoque mínimo |
| `imagem` | string (300) | URL da imagem principal |
| `imagensAdicionais` | array | URLs de imagens adicionais |
| `ncm` | string (10) | NCM do produto |
| `peso` | decimal | Peso (kg) |
| `altura` | decimal | Altura da embalagem (cm) |
| `largura` | decimal | Largura da embalagem (cm) |
| `comprimento` | decimal | Comprimento da embalagem (cm) |
| `unidade` | string (5) | Unidade de medida (ex: "UNID") |
| `ativo` | boolean | `false` = produto inativo no Hiper |
| `removido` | boolean | `true` = produto removido do e-commerce (deve ser ocultado/desativado) |
| `grade` | boolean | Possui variações |
| `variacao` | array | Variações do produto (ver abaixo) |
| `pontoDeSincronizacao` | int | Ponto de controle para sync incremental |
| `atacadoAtivo` | boolean | Preços de atacado ativos |
| `precoAtacado` | object | Lista de preços por quantidade |

### Campo `variacao`

Só presente quando `grade: true`. Cada item representa um produto filho:

```json
{
  "id": "uuid-do-filho",
  "codigoDeBarras": "9990000000173",
  "codigo": 3024,
  "nomeVariacaoA": "Azul",
  "tipoVariacaoA": "Cores",
  "nomeVariacaoB": null,
  "tipoVariacaoB": null,
  "quantidadeEmEstoque": 18,
  "quantidadeEmEstoqueReservado": 0,
  "quantidadeMinimaEmEstoque": 0,
  "variacaoAtiva": true
}
```

### Regras de negócio importantes

- **`removido: true`** → produto foi configurado para NÃO aparecer na loja. Deve ser desativado.
- **`ativo: false`** → produto inativo no Hiper. Deve ser desativado na loja.
- **`variacaoAtiva: false`** → variação específica inativa. Desativar essa variação.
- O vínculo com produto local é feito por `codigoDeBarras` (EAN) → SKU → nome.
- O campo `pontoDeSincronizacao` deve ser armazenado para syncs incrementais futuros.

### Exemplo de resposta (produto com grade)

```json
{
  "removido": false,
  "ativo": true,
  "codigo": 3024,
  "codigoDeBarras": "3024",
  "nome": "Produto com Grade",
  "marca": "TESTE",
  "categoria": "Outros",
  "preco": 188.43,
  "imagem": "https://tst-hipergestao.s3.amazonaws.com/.../original.jpeg",
  "imagensAdicionais": [
    { "imagem": "https://..." }
  ],
  "ncm": "0104.20.10",
  "peso": 0,
  "altura": 50,
  "largura": 0,
  "comprimento": 65,
  "grade": true,
  "quantidadeEmEstoque": 0,
  "variacao": [
    {
      "id": "uuid-filho-1",
      "codigoDeBarras": "9990000000173",
      "nomeVariacaoA": "Azul",
      "tipoVariacaoA": "Cores",
      "quantidadeEmEstoque": 18,
      "variacaoAtiva": true
    }
  ],
  "atacadoAtivo": true,
  "precoAtacado": {
    "precos": [
      { "precoUnitario": 170, "quantidade": 2 },
      { "precoUnitario": 160, "quantidade": 4 }
    ]
  }
}
```

---

## Estoque

**`GET /estoques/pontoDeSincronizacao?ProdutoId={id}`**

Consulta estoque de um produto específico pelo ID do Hiper.

### Resposta

```json
{
  "pontoDeSincronizacao": 1,
  "produtoId": "e41acf38-3f4b-4309-8988-8b33a4e5f359",
  "quantidadeEmEstoque": 0.000000,
  "quantidadeMinimaEmEstoque": 0.000000,
  "errors": [],
  "message": null
}
```

---

## Pedido de Venda — Criar

**`POST /pedido-de-venda/`**

Cria um pedido de venda no Hiper. **Apenas produtos originados do Hiper são aceitos.**

### Body

```json
{
  "cliente": {
    "documento": "19561920000",
    "email": "cliente@email.com",
    "inscricaoEstadual": "",
    "nomeDoCliente": "Nome do Cliente",
    "nomeFantasia": ""
  },
  "enderecoDeCobranca": {
    "bairro": "Centro",
    "cep": "88351001",
    "codigoIbge": 4202909,
    "complemento": "",
    "logradouro": "Rua Principal",
    "numero": "01"
  },
  "enderecoDeEntrega": {
    "bairro": "Centro",
    "cep": "88351001",
    "codigoIbge": 4202909,
    "complemento": "Sala 2",
    "logradouro": "Rua Principal",
    "numero": "22"
  },
  "itens": [
    {
      "produtoId": "e41acf38-3f4b-4309-8988-8b33a4e5f359",
      "quantidade": 1,
      "precoUnitarioBruto": 99.99,
      "precoUnitarioLiquido": 99.99
    }
  ],
  "meiosDePagamento": [
    {
      "idMeioDePagamento": 12,
      "parcelas": 1,
      "valor": 99.99
    }
  ],
  "numeroPedidoDeVenda": "PED-001",
  "observacaoDoPedidoDeVenda": "",
  "valorDoFrete": 10.00,
  "Marketplace": {
    "Cnpj": "12605982000124",
    "Nome": "Loja Virtual"
  }
}
```

> `Marketplace` é obrigatório apenas para estabelecimentos no estado de SC.

### Resposta

```json
{
  "id": "793bd707-505f-44bb-b02b-56972bf365d5",
  "errors": [],
  "message": "Pedido recebido e em processamento."
}
```

---

## Pedido de Venda — Consultar

**`GET /pedido-de-venda/eventos/{id}`**

Retorna o status e eventos de um pedido de venda pelo ID do Hiper.

### Resposta

```json
{
  "cancelado": false,
  "codigoDaSituacaoDeProcessamento": 2,
  "codigoDoPedidoDeVenda": "LV00000000002",
  "data": "14/03/2024 15:26:51",
  "eventos": [
    {
      "chaveDocumentoFiscal": null,
      "codigoDoTipoDeEvento": 1,
      "data": "14/03/2024 15:26:54",
      "observacao": "LV00000000002",
      "tipoDocumentoFiscal": null,
      "urlArquivoXml": null
    }
  ],
  "pedidoDeVendaId": "793bd707-505f-44bb-b02b-56972bf365d5",
  "errors": [],
  "message": null
}
```

---

## Pedido de Venda — Cancelar

**`PUT /pedido-de-venda/cancelar/{id}`**

Cancela um pedido de venda pelo ID do Hiper.

### Resposta

```json
{
  "errors": [],
  "message": "Cancelamento recebido e em processamento."
}
```

---

## Códigos de Status HTTP

| Código | Significado |
|---|---|
| 200 | OK — sucesso |
| 400 | Bad Request — parâmetro obrigatório ausente |
| 401 | Unauthorized — token ausente ou inválido |
| 402 | Request Failed — parâmetros válidos mas requisição falhou |
| 403 | Forbidden — token sem permissão |
| 404 | Not Found — recurso não existe |
| 409 | Conflict — conflito com outra requisição |
| 429 | Too Many Requests — limite de requisições atingido |
| 500–504 | Server Error — erro no lado do Hiper |

---

## IDs dos Meios de Pagamento

| ID | Meio de Pagamento |
|---|---|
| 1 | Dinheiro |
| 2 | Cheque |
| 3 | Devolução |
| 4 | Cartão de Crédito |
| 5 | Cartão de Débito |
| 6 | Crediário |
| 11 | Cartão Voucher |
| 12 | Pix |

---

## Implementação local

### Arquivos da integração

| Arquivo | Função |
|---|---|
| `src/lib/hiper.ts` | Cliente da API (token, produtos, estoque, pedidos) |
| `src/app/api/admin/integrations/hiper/sync-products/route.ts` | Sync de produtos e marcas |
| `src/app/api/admin/integrations/hiper/products/route.ts` | Lista produtos do Hiper para o seletor |
| `src/app/api/admin/integrations/hiper/link/[productId]/route.ts` | Vincula/desvincula produto manualmente |
| `src/app/api/admin/integrations/hiper/order/[orderId]/route.ts` | Consulta pedido no Hiper |

### O que o sync faz

1. Busca todos os produtos do Hiper (`pontoDeSincronizacao = 0` para sync completo)
2. Para cada produto:
   - `removido: true` → desativa o produto local se existir
   - `ativo: false` → desativa o produto local
   - Tenta casar com produto local por: **EAN** → **SKU** → **nome**
   - Vincula via `externalIdHiper`
   - Atualiza `ean` (para casamento automático em syncs futuros)
   - Cria/vincula a **marca** automaticamente
   - Atualiza **imagem** (se produto não tiver imagem própria)
   - Atualiza **NCM**, **peso**, **dimensões**
   - Atualiza **descrição** (se produto não tiver descrição própria)
   - Atualiza **estoque** com log no `StockLog`
3. Retorna: `matched`, `unmatched`, `stockUpdated`, `deactivated`, `errors`

### Variáveis de ambiente necessárias

```env
HIPER_API_SECRET_KEY=sua-chave-de-segurança
HIPER_MARKETPLACE_CNPJ=   # opcional, só para SC
HIPER_MARKETPLACE_NAME=   # opcional, só para SC
```
