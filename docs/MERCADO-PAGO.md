# Integração Mercado Pago - Checkout Bricks

## ✅ Integração Completa Implementada

### O que foi implementado:

1. **Payment Brick (Cartão)** - Formulário completo de pagamento com:
   - Cartão de crédito e débito
   - Detecção automática do tipo de cartão
   - Validação em tempo real
   - Parcelamento configurável

2. **PIX** - Pagamento instantâneo via Mercado Pago:
   - QR Code gerado automaticamente
   - Código copia e cola
   - Confirmação automática via webhook
   - Expiração em 15 minutos

3. **Boleto Bancário** - Geração de boletos:
   - Linha digitável
   - Link para impressão
   - Vencimento em 3 dias úteis
   - Notificação de pagamento via webhook

4. **Processamento de Pagamentos** - API backend que:
   - Processa todos os métodos de pagamento
   - Atualiza status do pedido automaticamente
   - Retorna confirmação instantânea

5. **Webhooks** - Notificações automáticas do Mercado Pago para:
   - Atualizar status de pagamentos pendentes
   - Processar aprovações/rejeições
   - Sincronizar reembolsos

## Configuração Rápida

### 1. Obtenha suas credenciais de teste

1. Acesse [Mercado Pago Desenvolvedores](https://www.mercadopago.com.br/developers)
2. Faça login ou crie uma conta
3. Vá em **Seu Negócio** > **Configurações** > **Chaves da API**
4. Você verá:
   - **Public Key (Chave Pública)**: Começa com `TEST-` em modo sandbox
   - **Access Token**: Começa com `APP_USR-` ou `TEST-` em modo sandbox

### 2. Configure no Admin

1. Acesse `/admin/settings`
2. Na seção **Pagamento**, clique em **Configurar Mercado Pago**
3. Cole suas credenciais de teste:
   - Public Key: `TEST-119edf4f-0d8c-4732-95a2-ebe39f6eebc4`
   - Access Token: `TEST-1188516462539574-010321-ca337732a13ca291c66f0d1c57d900c1-2485702150`
4. Clique em **Salvar Configuração**

### 3. Variáveis de Ambiente (`.env`)

```env
# Mercado Pago (Checkout Bricks)
MERCADO_PAGO_PUBLIC_KEY="TEST-119edf4f-0d8c-4732-95a2-ebe39f6eebc4"
MERCADO_PAGO_ACCESS_TOKEN="TEST-1188516462539574-010321-ca337732a13ca291c66f0d1c57d900c1-2485702150"
MERCADO_PAGO_SANDBOX="true"
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY="TEST-119edf4f-0d8c-4732-95a2-ebe39f6eebc4"
```

## Como Funciona

### Fluxo de Pagamento

**Cartão de Crédito/Débito:**
1. Cliente escolhe **Cartão** como método de pagamento
2. Redireciona para `/checkout/pagamento?method=cartao&orderId=xxx&total=xxx`
3. **Payment Brick** carrega com formulário completo
4. Cliente preenche dados do cartão
5. Ao submeter:
   - Dados tokenizados enviados ao Mercado Pago
   - Backend processa via `/api/payments/mercadopago/process`
   - Status atualizado automaticamente
6. Redirecionamento para confirmação

**PIX:**
1. Cliente escolhe **PIX** como método de pagamento
2. Redireciona para `/checkout/pagamento?method=pix&orderId=xxx&total=xxx`
3. Sistema chama `/api/payments/mercadopago/pix` automaticamente
4. QR Code e código copia-e-cola são exibidos
5. Cliente paga via app do banco
6. Webhook notifica aprovação instantânea
7. Pedido atualizado automaticamente

**Boleto:**
1. Cliente escolhe **Boleto** como método de pagamento
2. Redireciona para `/checkout/pagamento?method=boleto&orderId=xxx&total=xxx`
3. Sistema chama `/api/payments/mercadopago/boleto` automaticamente
4. Linha digitável e link para impressão são exibidos
5. Cliente paga em banco/casa lotérica
6. Webhook notifica pagamento (até 2 dias úteis)
7. Pedido atualizado automaticamente

### Componentes Criados

- **`MercadoPagoProvider`** - Inicializa o SDK do Mercado Pago
- **`MercadoPagoPaymentBrick`** - Componente do formulário de pagamento (cartão)
- **`/api/payments/mercadopago/process`** - Processa pagamentos com cartão
- **`/api/payments/mercadopago/pix`** - Gera QR Code PIX
- **`/api/payments/mercadopago/boleto`** - Gera boleto bancário
- **`/api/payments/mercadopago/webhook`** - Recebe notificações

## Teste em Sandbox

### Cartões de Teste

**Aprovado:**
- Cartão: `5031 4332 1540 6351`
- CVV: `123`
- Validade: `11/25`
- Nome: Qualquer nome
- CPF: `12345678909`

**Recusado (fundos insuficientes):**
- Cartão: `5031 7557 3453 0604`

### PIX em Sandbox

O Mercado Pago **gera QR Code e código automaticamente** em modo sandbox. 

**Para simular pagamento:**
1. Use o QR Code ou código gerado
2. Em sandbox, o pagamento é aprovado automaticamente após alguns segundos
3. O webhook notificará o sistema

### Boleto em Sandbox

O Mercado Pago **gera boleto automaticamente** em modo sandbox.

**Para simular pagamento:**
1. Acesse o link do boleto gerado
2. Em sandbox, use as ferramentas de teste do Mercado Pago
3. Ou aguarde - alguns boletos são aprovados automaticamente para teste

## Webhooks (Notificações)

### URL do Webhook
```
https://seu-dominio.com/api/payments/mercadopago/webhook
```

### Configurar no Mercado Pago

1. Vá em **Seu Negócio** > **Configurações** > **Webhooks**
2. Adicione a URL acima
3. Selecione eventos: `payment`
4. Salve

### Com ngrok
```bash
# URL ficará
https://abc123.ngrok-free.dev/api/payments/mercadopago/webhook
```

## Próximos Passos

### Para Produção

1. Obtenha credenciais de produção em [Mercado Pago](https://www.mercadopago.com.br/developers)
2. Mude `MERCADO_PAGO_SANDBOX` para `"false"`
3. Atualize as chaves para as credenciais de produção (começam sem `TEST-`)
4. Configure webhooks com URL de produção
5. Teste com transações reais de baixo valor

### Segurança

- ✅ Tokenização de cartões (PCI Compliance)
- ✅ Processamento no backend
- ✅ Validação de webhooks
- ✅ HTTPS obrigatório em produção

## Meios de Pagamento Disponíveis

### Cartões
- Visa
- Mastercard
- Elo
- Amex
- Hipercard

### Outros
- PIX (instantâneo)
- Boleto (até 3 dias úteis)
- Débito em Conta
- Mercado Pago (saldo na conta)

## Troubleshooting

### Payment Brick não carrega
- Verifique se `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` está no `.env`
- Reinicie o servidor após alterar `.env`
- Verifique console do navegador para erros

### Pagamento não processa
- Verifique credenciais no Admin
- Confirme que `MERCADO_PAGO_ACCESS_TOKEN` está correto
- Veja logs do servidor para erros da API

### Webhook não recebe notificações
- Use ngrok para expor localhost
- Configure URL completa no painel do Mercado Pago
- Verifique logs em `/api/payments/mercadopago/webhook`

## Referências

- [Documentação Checkout Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/landing)
- [Payment Brick](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/introduction)
- [API de Pagamentos](https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post)
- [Dados de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/test-cards)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
