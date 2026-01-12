/**
 * Melhor Envio - Funções de Geração de Etiquetas
 * Fluxo: Adicionar ao Carrinho -> Checkout -> Gerar Etiqueta -> Imprimir
 */

import { prisma } from '@/lib/prisma';
import { getAccessToken, commonHeaders } from '@/lib/melhorenvio-oauth';

function melhorEnvioBaseUrl() {
  const isSandbox = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false';
  return isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
}

export type ShippingLabelInput = {
  orderId: string;
  serviceId: string | number; // ID do serviço (1 = PAC, 2 = SEDEX, etc)
  from: {
    name: string;
    phone: string;
    email: string;
    document: string; // CPF (pessoa física)
    company_document?: string; // CNPJ (pessoa jurídica - obrigatório se PJ)
    state_register?: string; // Inscrição Estadual (pessoa jurídica)
    economic_activity_code?: string; // CNAE (obrigatório para LATAM)
    address: string;
    complement?: string;
    number: string;
    district: string;
    city: string;
    country_id?: string;
    state_abbr: string;
    postal_code: string;
  };
  to: {
    name: string;
    phone: string;
    email: string;
    document: string; // CPF do destinatário
    company_document?: string; // CNPJ se for PJ
    state_register?: string; // IE ou "ISENTO"
    address: string;
    complement?: string;
    number: string;
    district: string;
    city: string;
    country_id?: string;
    state_abbr: string;
    postal_code: string;
  };
  products: Array<{
    name: string;
    quantity: number | string;
    unitary_value: number | string;
  }>;
  volumes: Array<{
    height: number;
    width: number;
    length: number;
    weight: number;
  }>;
  options?: {
    insurance_value?: number; // Valor total de seguro (soma dos produtos)
    receipt?: boolean; // Aviso de Recebimento
    own_hand?: boolean; // Mãos Próprias
    reverse?: boolean; // Logística reversa
    non_commercial?: boolean; // Envio não comercial (declaração de conteúdo)
    platform?: string; // Nome da plataforma
    reminder?: string; // Anotação impressa na etiqueta
    tags?: Array<{ tag: string; url?: string }>; // Tags para identificação
    invoice?: {
      key: string; // Chave da NF-e (obrigatório para envios comerciais)
    };
  };
};

export type MelhorEnvioLabelResult = {
  success: boolean;
  orderId?: string;
  labelId?: string;
  trackingCode?: string;
  trackingUrl?: string | null;
  labelUrl?: string;
  status?: string;
  error?: string;
  rawResponse?: any;
};

/**
 * 1. Adicionar frete ao carrinho do Melhor Envio
 * 
 * Documentação: https://docs.melhorenvio.com.br/reference/inserir-fretes-no-carrinho
 * 
 * Regras importantes:
 * - Pessoa Física: enviar apenas document (CPF)
 * - Pessoa Jurídica: enviar company_document (CNPJ), state_register (IE) e economic_activity_code (CNAE para LATAM)
 * - Correios, J&T e Loggi: não aceitam múltiplos volumes, fazer chamadas separadas
 * - Envios comerciais: obrigatório options.invoice.key (chave NF-e)
 * - Envios não comerciais: não informar NF-e
 */
export async function addToMelhorEnvioCart(input: ShippingLabelInput): Promise<MelhorEnvioLabelResult> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[MELHOR_ENVIO] Token não disponível');
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] ========================================');
  console.log('[MELHOR_ENVIO] Adicionando ao carrinho');
  console.log('[MELHOR_ENVIO] Pedido:', input.orderId);
  console.log('[MELHOR_ENVIO] Serviço:', input.serviceId);
  console.log('[MELHOR_ENVIO] Base URL:', baseUrl);
  console.log('[MELHOR_ENVIO] ========================================');

  // Montar body conforme documentação oficial
  const body: Record<string, any> = {
    service: Number(input.serviceId),
    from: {
      name: input.from.name,
      phone: input.from.phone.replace(/\D/g, ''),
      email: input.from.email,
      document: input.from.document?.replace(/\D/g, '') || '',
      address: input.from.address,
      complement: input.from.complement || '',
      number: input.from.number,
      district: input.from.district,
      city: input.from.city,
      state_abbr: input.from.state_abbr,
      postal_code: input.from.postal_code.replace(/\D/g, ''),
    },
    to: {
      name: input.to.name,
      phone: input.to.phone.replace(/\D/g, ''),
      email: input.to.email,
      document: input.to.document?.replace(/\D/g, '') || '',
      address: input.to.address,
      complement: input.to.complement || '',
      number: input.to.number,
      district: input.to.district,
      city: input.to.city,
      state_abbr: input.to.state_abbr,
      postal_code: input.to.postal_code.replace(/\D/g, ''),
      country_id: input.to.country_id || 'BR',
    },
    products: input.products.map(p => ({
      name: p.name,
      quantity: String(p.quantity),
      unitary_value: String(Number(p.unitary_value).toFixed(2)),
    })),
    volumes: input.volumes.map(v => ({
      height: Math.max(2, Math.round(v.height)),
      width: Math.max(11, Math.round(v.width)),
      length: Math.max(16, Math.round(v.length)),
      weight: Math.max(0.3, Number(v.weight.toFixed(2))),
    })),
    options: {
      insurance_value: Number((input.options?.insurance_value || 0).toFixed(2)),
      receipt: input.options?.receipt || false,
      own_hand: input.options?.own_hand || false,
      reverse: input.options?.reverse || false,
      platform: input.options?.platform || process.env.NEXT_PUBLIC_APP_NAME || 'Loja Virtual',
      tags: input.options?.tags || [{ tag: input.orderId }],
    },
  };

  // Adicionar campos de pessoa jurídica se existirem (remetente)
  if (input.from.company_document) {
    body.from.company_document = input.from.company_document.replace(/\D/g, '');
    if (input.from.state_register) {
      body.from.state_register = input.from.state_register;
    }
    if (input.from.economic_activity_code) {
      body.from.economic_activity_code = input.from.economic_activity_code;
    }
  }

  // Adicionar campos de pessoa jurídica se existirem (destinatário)
  if (input.to.company_document) {
    body.to.company_document = input.to.company_document.replace(/\D/g, '');
    if (input.to.state_register) {
      body.to.state_register = input.to.state_register;
    }
  }

  // Adicionar reminder se existir
  if (input.options?.reminder) {
    body.options.reminder = input.options.reminder;
  }

  // Adicionar NF-e se for envio comercial
  if (input.options?.invoice?.key) {
    body.options.invoice = { key: input.options.invoice.key };
  }

  try {
    console.log('[MELHOR_ENVIO] Request body:', JSON.stringify(body, null, 2));

    const res = await fetch(`${baseUrl}/api/v2/me/cart`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Response status:', res.status);
    console.log('[MELHOR_ENVIO] Response body:', responseText);

    if (!res.ok) {
      console.error('[MELHOR_ENVIO] Erro ao adicionar ao carrinho:', res.status, responseText);
      
      // Tentar extrair mensagem de erro mais específica
      let errorMessage = `Erro ${res.status}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) errorMessage = errorData.message;
        if (errorData.error) errorMessage = errorData.error;
        if (errorData.errors) {
          const errors = Object.values(errorData.errors).flat().join(', ');
          errorMessage = errors || errorMessage;
        }
      } catch {
        errorMessage = responseText?.slice(0, 200) || errorMessage;
      }
      
      return { success: false, error: errorMessage, rawResponse: responseText };
    }

    const data = JSON.parse(responseText);
    const meOrderId = data.id || data.order_id;

    console.log('[MELHOR_ENVIO] ========================================');
    console.log('[MELHOR_ENVIO] Adicionado ao carrinho com sucesso!');
    console.log('[MELHOR_ENVIO] ID do pedido no Melhor Envio:', meOrderId);
    console.log('[MELHOR_ENVIO] ========================================');

    return {
      success: true,
      orderId: meOrderId,
      status: 'pending',
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[MELHOR_ENVIO] Exceção ao adicionar ao carrinho:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 1.1 Logística Reversa - Adicionar devolução ao carrinho
 * 
 * Documentação: https://docs.melhorenvio.com.br/reference/inserir-logistica-reversa-no-carrinho
 * 
 * Dois cenários:
 * 1. Envio original feito pelo Melhor Envio: informar order_id do envio original
 * 2. Envio original NÃO feito pelo Melhor Envio: informar todos os dados (from, to, products)
 * 
 * IMPORTANTE: No Sandbox, não é possível gerar a etiqueta de devolução, apenas inserir no carrinho.
 * Em produção funciona normalmente.
 */
export type ReverseShippingInput = {
  serviceId: 1 | 2; // 1 = PAC, 2 = SEDEX (apenas Correios)
  newSenderEmail: string;
  newSenderPhone: string;
  insuranceValue: number;
  // Se o envio original foi feito pelo Melhor Envio:
  originalOrderId?: string;
  // Se o envio original NÃO foi feito pelo Melhor Envio:
  from?: {
    name: string;
    document: string;
    company_document?: string;
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state_abbr: string;
    postal_code: string;
  };
  to?: {
    name: string;
    phone: string;
    email: string;
    document: string;
    company_document?: string;
    state_register?: string;
    economic_activity_code?: string;
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state_abbr: string;
    postal_code: string;
    note?: string;
  };
  products?: Array<{
    name: string;
    quantity: number;
    unitary_value: number;
    weight: number;
  }>;
  package: {
    weight: number;
    height: number;
    width: number;
    length: number;
  };
  options?: {
    own_hand?: boolean;
    receipt?: boolean;
  };
};

export async function addReverseToMelhorEnvioCart(input: ReverseShippingInput): Promise<MelhorEnvioLabelResult> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[MELHOR_ENVIO_REVERSE] Token não disponível');
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO_REVERSE] ========================================');
  console.log('[MELHOR_ENVIO_REVERSE] Adicionando logística reversa ao carrinho');
  console.log('[MELHOR_ENVIO_REVERSE] Serviço:', input.serviceId === 1 ? 'PAC' : 'SEDEX');
  console.log('[MELHOR_ENVIO_REVERSE] ========================================');

  // Montar body conforme o cenário
  const body: Record<string, any> = {
    service: input.serviceId,
    new_sender_mail: input.newSenderEmail,
    new_sender_phone: input.newSenderPhone.replace(/\D/g, ''),
    insurance_value: Number(input.insuranceValue.toFixed(2)),
    package: {
      weight: Math.max(0.3, Number(input.package.weight.toFixed(2))),
      height: Math.max(2, Math.round(input.package.height)),
      width: Math.max(11, Math.round(input.package.width)),
      length: Math.max(16, Math.round(input.package.length)),
    },
    options: {
      own_hand: input.options?.own_hand || false,
      receipt: input.options?.receipt || false,
    },
  };

  // Cenário 1: Envio original feito pelo Melhor Envio
  if (input.originalOrderId) {
    body.order_id = input.originalOrderId;
    console.log('[MELHOR_ENVIO_REVERSE] Modo: Devolução de envio do Melhor Envio');
    console.log('[MELHOR_ENVIO_REVERSE] Order ID original:', input.originalOrderId);
  }
  // Cenário 2: Envio original NÃO feito pelo Melhor Envio
  else if (input.from && input.to && input.products) {
    body.from = {
      name: input.from.name,
      document: input.from.document?.replace(/\D/g, '') || '',
      address: input.from.address,
      number: input.from.number,
      district: input.from.district,
      city: input.from.city,
      state_abbr: input.from.state_abbr,
      postal_code: input.from.postal_code.replace(/\D/g, ''),
    };
    
    if (input.from.company_document) {
      body.from.company_document = input.from.company_document.replace(/\D/g, '');
    }
    if (input.from.complement) {
      body.from.complement = input.from.complement;
    }

    body.to = {
      name: input.to.name,
      phone: input.to.phone.replace(/\D/g, ''),
      email: input.to.email,
      document: input.to.document?.replace(/\D/g, '') || '',
      address: input.to.address,
      number: input.to.number,
      district: input.to.district,
      city: input.to.city,
      state_abbr: input.to.state_abbr,
      postal_code: input.to.postal_code.replace(/\D/g, ''),
    };
    
    if (input.to.company_document) {
      body.to.company_document = input.to.company_document.replace(/\D/g, '');
    }
    if (input.to.state_register) {
      body.to.state_register = input.to.state_register;
    }
    if (input.to.economic_activity_code) {
      body.to.economic_activity_code = input.to.economic_activity_code;
    }
    if (input.to.complement) {
      body.to.complement = input.to.complement;
    }
    if (input.to.note) {
      body.to.note = input.to.note;
    }

    body.products = input.products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      unitary_value: Number(p.unitary_value.toFixed(2)),
      weight: Number(p.weight.toFixed(2)),
    }));

    console.log('[MELHOR_ENVIO_REVERSE] Modo: Devolução de envio externo');
  } else {
    return { 
      success: false, 
      error: 'Para logística reversa, informe originalOrderId OU (from, to e products)' 
    };
  }

  try {
    console.log('[MELHOR_ENVIO_REVERSE] Request body:', JSON.stringify(body, null, 2));

    const res = await fetch(`${baseUrl}/api/v2/me/cart/reverse`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO_REVERSE] Response status:', res.status);
    console.log('[MELHOR_ENVIO_REVERSE] Response body:', responseText);

    if (!res.ok) {
      console.error('[MELHOR_ENVIO_REVERSE] Erro ao adicionar ao carrinho:', res.status, responseText);
      
      let errorMessage = `Erro ${res.status}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) errorMessage = errorData.message;
        if (errorData.error) errorMessage = errorData.error;
        if (errorData.errors) {
          const errors = Object.values(errorData.errors).flat().join(', ');
          errorMessage = errors || errorMessage;
        }
      } catch {
        errorMessage = responseText?.slice(0, 200) || errorMessage;
      }
      
      return { success: false, error: errorMessage, rawResponse: responseText };
    }

    const data = JSON.parse(responseText);
    const meOrderId = data.id || data.order_id;

    console.log('[MELHOR_ENVIO_REVERSE] ========================================');
    console.log('[MELHOR_ENVIO_REVERSE] Adicionado ao carrinho com sucesso!');
    console.log('[MELHOR_ENVIO_REVERSE] ID do pedido reverso:', meOrderId);
    console.log('[MELHOR_ENVIO_REVERSE] ========================================');

    return {
      success: true,
      orderId: meOrderId,
      status: 'pending_reverse',
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[MELHOR_ENVIO_REVERSE] Exceção:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Criar logística reversa completa para um pedido
 * Fluxo: Adicionar ao carrinho -> Checkout -> Gerar etiqueta (apenas produção)
 */
export async function createReverseShippingForOrder(
  orderId: string,
  newSenderEmail: string,
  newSenderPhone: string
): Promise<MelhorEnvioLabelResult> {
  console.log('[MELHOR_ENVIO_REVERSE] ========================================');
  console.log('[MELHOR_ENVIO_REVERSE] Criando logística reversa para pedido:', orderId);
  console.log('[MELHOR_ENVIO_REVERSE] ========================================');

  // Buscar dados do pedido original
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, weight: true, dimensions: true, price: true }
          }
        }
      },
      user: true,
    },
  });

  if (!order) {
    console.error('[MELHOR_ENVIO_REVERSE] Pedido não encontrado:', orderId);
    return { success: false, error: 'Pedido não encontrado' };
  }

  // Verificar se o pedido original tem ID do Melhor Envio
  if (!order.melhorEnvioOrderId) {
    console.error('[MELHOR_ENVIO_REVERSE] Pedido não possui ID do Melhor Envio');
    return { success: false, error: 'Pedido não possui etiqueta do Melhor Envio' };
  }

  // Calcular peso e dimensões
  let totalWeight = 0;
  let maxHeight = 0;
  let maxWidth = 0;
  let totalLength = 0;

  order.items.forEach((item) => {
    const product = item.product;
    const dims = (product?.dimensions as any) || { height: 10, width: 15, length: 20 };
    const weight = (product?.weight || 0.5) * item.quantity;
    
    totalWeight += weight;
    maxHeight = Math.max(maxHeight, dims.height || 10);
    maxWidth = Math.max(maxWidth, dims.width || 15);
    totalLength += (dims.length || 20) * item.quantity;
  });

  // Determinar serviço (usar o mesmo do envio original ou PAC como padrão)
  const serviceId = (order.melhorEnvioService === '2' ? 2 : 1) as 1 | 2;

  // Adicionar ao carrinho de reversa
  const cartResult = await addReverseToMelhorEnvioCart({
    serviceId,
    newSenderEmail,
    newSenderPhone,
    insuranceValue: order.total,
    originalOrderId: order.melhorEnvioOrderId,
    package: {
      weight: Math.max(0.3, totalWeight),
      height: Math.max(2, maxHeight),
      width: Math.max(11, maxWidth),
      length: Math.max(16, Math.min(totalLength, 100)),
    },
  });

  if (!cartResult.success || !cartResult.orderId) {
    console.error('[MELHOR_ENVIO_REVERSE] Falha ao adicionar ao carrinho');
    return cartResult;
  }

  const meReverseOrderId = cartResult.orderId;
  console.log('[MELHOR_ENVIO_REVERSE] ID do pedido reverso:', meReverseOrderId);

  // Fazer checkout
  const checkoutResult = await checkoutMelhorEnvio([meReverseOrderId]);
  if (!checkoutResult.success) {
    console.error('[MELHOR_ENVIO_REVERSE] Falha no checkout');
    return checkoutResult;
  }

  // Gerar etiqueta (só funciona em produção)
  const isSandbox = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false';
  
  if (isSandbox) {
    console.warn('[MELHOR_ENVIO_REVERSE] ⚠️ Ambiente Sandbox: geração de etiqueta reversa não disponível');
    return {
      success: true,
      orderId: meReverseOrderId,
      status: 'pending_reverse_sandbox',
      error: 'Sandbox: geração de etiqueta reversa não disponível. Use produção para gerar.',
    };
  }

  // Em produção, gerar etiqueta
  const generateResult = await generateMelhorEnvioLabel([meReverseOrderId]);
  if (!generateResult.success) {
    console.error('[MELHOR_ENVIO_REVERSE] Falha ao gerar etiqueta');
    return generateResult;
  }

  // Obter URL de impressão
  const printResult = await printMelhorEnvioLabel([meReverseOrderId]);

  console.log('[MELHOR_ENVIO_REVERSE] ========================================');
  console.log('[MELHOR_ENVIO_REVERSE] Etiqueta reversa criada com sucesso!');
  console.log('[MELHOR_ENVIO_REVERSE] Tracking:', generateResult.trackingCode);
  console.log('[MELHOR_ENVIO_REVERSE] URL:', printResult.url);
  console.log('[MELHOR_ENVIO_REVERSE] ========================================');

  return {
    success: true,
    orderId: meReverseOrderId,
    labelId: meReverseOrderId,
    trackingCode: generateResult.trackingCode,
    labelUrl: printResult.url,
    status: 'generated_reverse',
  };
}

/**
 * 2. Fazer checkout (comprar o frete) - usando saldo do Melhor Envio
 */
export async function checkoutMelhorEnvio(orderIds: string[]): Promise<MelhorEnvioLabelResult> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[MELHOR_ENVIO] Token não disponível para checkout');
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Realizando checkout para:', orderIds);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orders: orderIds }),
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Checkout response status:', res.status);
    console.log('[MELHOR_ENVIO] Checkout response body:', responseText);

    if (!res.ok) {
      console.error('[MELHOR_ENVIO] Erro no checkout:', res.status, responseText);
      return { success: false, error: `Erro ${res.status}: ${responseText}`, rawResponse: responseText };
    }

    const data = JSON.parse(responseText);
    console.log('[MELHOR_ENVIO] Checkout realizado com sucesso');

    // Extrair tracking code da resposta do checkout
    let trackingCode: string | undefined;
    
    // Tenta extrair do conciliation_group.conciliations
    if (data.conciliation_group?.conciliations?.length > 0) {
      trackingCode = data.conciliation_group.conciliations[0].tracking;
    }
    
    // Tenta extrair do purchase.orders
    if (!trackingCode && data.purchase?.orders?.length > 0) {
      trackingCode = data.purchase.orders[0].tracking;
    }

    if (trackingCode) {
      console.log('[MELHOR_ENVIO] Tracking code obtido do checkout:', trackingCode);
    }

    return {
      success: true,
      status: 'paid',
      trackingCode,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[MELHOR_ENVIO] Exceção no checkout:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Gerar etiqueta
 */
export async function generateMelhorEnvioLabel(orderIds: string[]): Promise<MelhorEnvioLabelResult> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[MELHOR_ENVIO] Token não disponível para gerar etiqueta');
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Gerando etiqueta para:', orderIds);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/shipment/generate`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orders: orderIds }),
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Gerar etiqueta response status:', res.status);
    console.log('[MELHOR_ENVIO] Gerar etiqueta response body:', responseText);

    if (!res.ok) {
      console.error('[MELHOR_ENVIO] Erro ao gerar etiqueta:', res.status, responseText);
      return { success: false, error: `Erro ${res.status}: ${responseText}`, rawResponse: responseText };
    }

    const data = JSON.parse(responseText);
    console.log('[MELHOR_ENVIO] Etiqueta gerada com sucesso');

    // Extrair tracking code se disponível
    let trackingCode: string | undefined;
    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey && data[firstKey]?.tracking) {
        trackingCode = data[firstKey].tracking;
      }
    }

    return {
      success: true,
      status: 'generated',
      trackingCode,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[MELHOR_ENVIO] Exceção ao gerar etiqueta:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Obter URL para impressão da etiqueta
 * Modos válidos: 'private' (link privado) ou 'public' (link público compartilhável)
 */
export async function printMelhorEnvioLabel(orderIds: string[], mode: 'private' | 'public' = 'private'): Promise<{ success: boolean; url?: string; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[MELHOR_ENVIO] Token não disponível para imprimir etiqueta');
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Obtendo URL de impressão para:', orderIds, 'modo:', mode);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, orders: orderIds }),
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Print response status:', res.status);
    console.log('[MELHOR_ENVIO] Print response body:', responseText);

    if (!res.ok) {
      console.error('[MELHOR_ENVIO] Erro ao obter URL de impressão:', res.status, responseText);
      return { success: false, error: `Erro ${res.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    const url = data.url || data.print_url;

    console.log('[MELHOR_ENVIO] URL de impressão obtida:', url);

    return { success: true, url };
  } catch (err: any) {
    console.error('[MELHOR_ENVIO] Exceção ao obter URL de impressão:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Pré-visualizar etiqueta (sem comprar)
 */
export async function previewMelhorEnvioLabel(orderIds: string[]): Promise<{ success: boolean; url?: string; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Pré-visualizando etiqueta para:', orderIds);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/shipment/preview`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orders: orderIds }),
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Preview response status:', res.status);

    if (!res.ok) {
      console.error('[MELHOR_ENVIO] Erro ao pré-visualizar:', res.status, responseText);
      return { success: false, error: `Erro ${res.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    const url = data.url || data.preview_url;

    return { success: true, url };
  } catch (err: any) {
    console.error('[MELHOR_ENVIO] Exceção ao pré-visualizar:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Consultar status de um pedido no Melhor Envio
 */
export async function getMelhorEnvioOrderStatus(orderId: string): Promise<{ success: boolean; status?: string; tracking?: string; error?: string; rawResponse?: any }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Consultando status do pedido:', orderId);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/orders/${orderId}`, {
      method: 'GET',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Status response:', res.status);

    if (!res.ok) {
      return { success: false, error: `Erro ${res.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    return {
      success: true,
      status: data.status,
      tracking: data.tracking,
      rawResponse: data,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. Listar todos os itens do carrinho
 */
export async function listMelhorEnvioCart(): Promise<{ success: boolean; items?: any[]; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Listando itens do carrinho');

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/cart`, {
      method: 'GET',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Cart list response:', res.status);

    if (!res.ok) {
      return { success: false, error: `Erro ${res.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    // A resposta pode ser um array direto ou um objeto com data
    const items = Array.isArray(data) ? data : (data.data || []);
    
    console.log('[MELHOR_ENVIO] Total de itens no carrinho:', items.length);
    return { success: true, items };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 8. Exibir informações de um item específico do carrinho
 */
export async function getMelhorEnvioCartItem(itemId: string): Promise<{ success: boolean; item?: any; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Buscando item do carrinho:', itemId);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/cart/${itemId}`, {
      method: 'GET',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
    });

    const responseText = await res.text();
    console.log('[MELHOR_ENVIO] Cart item response:', res.status);

    if (!res.ok) {
      return { success: false, error: `Erro ${res.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    return { success: true, item: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 9. Remover item do carrinho
 */
export async function removeMelhorEnvioCartItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Token não disponível' };
  }

  const baseUrl = melhorEnvioBaseUrl();
  console.log('[MELHOR_ENVIO] Removendo item do carrinho:', itemId);

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/cart/${itemId}`, {
      method: 'DELETE',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
    });

    console.log('[MELHOR_ENVIO] Cart remove response:', res.status);

    // 204 No Content ou 200 OK são respostas de sucesso
    if (res.status === 204 || res.ok) {
      console.log('[MELHOR_ENVIO] Item removido com sucesso');
      return { success: true };
    }

    const responseText = await res.text();
    return { success: false, error: `Erro ${res.status}: ${responseText}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 10. Limpar todo o carrinho (remove todos os itens)
 */
export async function clearMelhorEnvioCart(): Promise<{ success: boolean; removed: number; errors: string[] }> {
  console.log('[MELHOR_ENVIO] Limpando carrinho...');
  
  const cartResult = await listMelhorEnvioCart();
  if (!cartResult.success || !cartResult.items) {
    return { success: false, removed: 0, errors: [cartResult.error || 'Erro ao listar carrinho'] };
  }

  if (cartResult.items.length === 0) {
    console.log('[MELHOR_ENVIO] Carrinho já está vazio');
    return { success: true, removed: 0, errors: [] };
  }

  let removed = 0;
  const errors: string[] = [];

  for (const item of cartResult.items) {
    const itemId = item.id;
    const removeResult = await removeMelhorEnvioCartItem(itemId);
    if (removeResult.success) {
      removed++;
    } else {
      errors.push(`Item ${itemId}: ${removeResult.error}`);
    }
  }

  console.log(`[MELHOR_ENVIO] Carrinho limpo. Removidos: ${removed}, Erros: ${errors.length}`);
  return { success: errors.length === 0, removed, errors };
}

/**
 * Função principal: Criar etiqueta completa para um pedido
 * Executa todo o fluxo: Adicionar ao carrinho -> Checkout -> Gerar etiqueta
 */
export async function createShippingLabelForOrder(orderId: string): Promise<MelhorEnvioLabelResult> {
  console.log('[MELHOR_ENVIO] ========================================');
  console.log('[MELHOR_ENVIO] Iniciando criação de etiqueta para pedido:', orderId);
  console.log('[MELHOR_ENVIO] ========================================');

  // Buscar dados do pedido
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, weight: true, dimensions: true, price: true }
          }
        }
      },
      user: true,
    },
  });

  if (!order) {
    console.error('[MELHOR_ENVIO] Pedido não encontrado:', orderId);
    return { success: false, error: 'Pedido não encontrado' };
  }

  console.log('[MELHOR_ENVIO] Pedido encontrado:', order.orderNumber);
  console.log('[MELHOR_ENVIO] Endereço de entrega:', JSON.stringify(order.shippingAddress, null, 2));

  const shippingAddr = order.shippingAddress as any;
  
  // Verificar se é retirada em loja
  if (shippingAddr?.deliveryMethod === 'Retirada na Loja (Feira de Santana)' || order.shippingServiceId === 'pickup-feira') {
    console.log('[MELHOR_ENVIO] Pedido é retirada em loja, pulando geração de etiqueta');
    return { success: true, status: 'pickup', error: 'Retirada em loja - sem etiqueta' };
  }

  // Dados do remetente (loja)
  const from = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Shopping das Ferramentas',
    phone: process.env.STORE_PHONE || '75999999999',
    email: process.env.STORE_EMAIL || 'contato@shoppingdasferramentas.com.br',
    document: process.env.STORE_CPF || '12345678900', // CPF do responsável
    company_document: process.env.STORE_CNPJ || undefined,
    state_register: process.env.STORE_IE || undefined,
    address: process.env.STORE_ADDRESS || 'Rua Exemplo',
    complement: process.env.STORE_COMPLEMENT || '',
    number: process.env.STORE_NUMBER || '100',
    district: process.env.STORE_DISTRICT || 'Centro',
    city: process.env.STORE_CITY || 'Feira de Santana',
    country_id: 'BR',
    state_abbr: process.env.STORE_STATE || 'BA',
    postal_code: (process.env.SHIPPING_ORIGIN_ZIP || '44002264').replace(/\D/g, ''),
  };

  // Dados do destinatário
  const to = {
    name: shippingAddr?.name || order.user?.name || 'Cliente',
    phone: (shippingAddr?.phone || order.user?.phone || '').replace(/\D/g, ''),
    email: shippingAddr?.email || order.user?.email || '',
    document: (shippingAddr?.cpf || '').replace(/\D/g, ''),
    state_register: 'ISENTO', // Pessoa física é sempre isento
    address: shippingAddr?.street || '',
    complement: shippingAddr?.complement || '',
    number: shippingAddr?.number || 'S/N',
    district: shippingAddr?.neighborhood || '',
    city: shippingAddr?.city || '',
    country_id: 'BR',
    state_abbr: shippingAddr?.state || '',
    postal_code: (shippingAddr?.zip || '').replace(/\D/g, ''),
  };

  console.log('[MELHOR_ENVIO] Remetente:', JSON.stringify(from, null, 2));
  console.log('[MELHOR_ENVIO] Destinatário:', JSON.stringify(to, null, 2));

  // Calcular dimensões e peso totais
  let totalWeight = 0;
  let maxHeight = 0;
  let maxWidth = 0;
  let totalLength = 0;
  let totalInsurance = 0;

  const products = order.items.map((item) => {
    const product = item.product;
    const dims = (product?.dimensions as any) || { height: 10, width: 15, length: 20 };
    const weight = (product?.weight || 0.5) * item.quantity;
    
    totalWeight += weight;
    totalInsurance += item.price * item.quantity;
    maxHeight = Math.max(maxHeight, dims.height || 10);
    maxWidth = Math.max(maxWidth, dims.width || 15);
    totalLength += (dims.length || 20) * item.quantity;

    return {
      name: product?.name || 'Produto',
      quantity: item.quantity,
      unitary_value: item.price, // Valor unitário
    };
  });

  // Volumes: dimensões do pacote consolidado
  const volumes = [{
    height: Math.max(2, Math.round(maxHeight)),
    width: Math.max(11, Math.round(maxWidth)),
    length: Math.max(16, Math.round(Math.min(totalLength, 100))), // Max 100cm
    weight: Math.max(0.3, Number(totalWeight.toFixed(2))),
  }];

  console.log('[MELHOR_ENVIO] Produtos:', JSON.stringify(products, null, 2));
  console.log('[MELHOR_ENVIO] Volumes:', JSON.stringify(volumes, null, 2));

  // Determinar o serviço de frete
  const serviceId = order.shippingServiceId || shippingAddr?.serviceId || '1'; // Default: PAC (1)
  console.log('[MELHOR_ENVIO] Serviço selecionado:', serviceId);

  // Limitar insurance_value a R$ 1000 (limite para envios não comerciais no sandbox)
  const maxInsurance = 1000;
  const insuranceValue = Math.min(totalInsurance, maxInsurance);
  console.log('[MELHOR_ENVIO] Valor seguro:', insuranceValue, '(original:', totalInsurance, ')');

  // 1. Adicionar ao carrinho
  const cartResult = await addToMelhorEnvioCart({
    orderId: order.orderNumber,
    serviceId,
    from,
    to,
    products,
    volumes,
    options: {
      insurance_value: insuranceValue, // Limitado a R$ 1000 para envios não comerciais
      platform: process.env.NEXT_PUBLIC_APP_NAME || 'Loja Virtual',
      reminder: `Pedido ${order.orderNumber}`, // Anotação na etiqueta
      tags: [{ tag: order.orderNumber }],
      receipt: false,
      own_hand: false,
      reverse: false,
      // Não enviamos invoice.key pois é declaração de conteúdo (não comercial)
    },
  });

  if (!cartResult.success || !cartResult.orderId) {
    console.error('[MELHOR_ENVIO] Falha ao adicionar ao carrinho');
    return cartResult;
  }

  const meOrderId = cartResult.orderId;
  console.log('[MELHOR_ENVIO] ID do pedido no Melhor Envio:', meOrderId);

  // Salvar ID do Melhor Envio no pedido
  await prisma.order.update({
    where: { id: orderId },
    data: {
      melhorEnvioOrderId: meOrderId,
      melhorEnvioStatus: 'pending',
      melhorEnvioService: String(serviceId),
    },
  });

  // 2. Fazer checkout (comprar frete)
  const checkoutResult = await checkoutMelhorEnvio([meOrderId]);
  if (!checkoutResult.success) {
    console.error('[MELHOR_ENVIO] Falha no checkout');
    await prisma.order.update({
      where: { id: orderId },
      data: { melhorEnvioStatus: 'checkout_failed' },
    });
    return checkoutResult;
  }

  // Tracking code vem do checkout
  const trackingCode = checkoutResult.trackingCode;

  // Gerar URL de rastreio baseada no código
  const trackingUrl = trackingCode 
    ? `https://www.melhorrastreio.com.br/rastreio/${trackingCode}` 
    : null;

  await prisma.order.update({
    where: { id: orderId },
    data: { 
      melhorEnvioStatus: 'paid',
      trackingCode: trackingCode || null,
      trackingUrl: trackingUrl,
    },
  });

  // 3. Gerar etiqueta
  const generateResult = await generateMelhorEnvioLabel([meOrderId]);
  if (!generateResult.success) {
    console.error('[MELHOR_ENVIO] Falha ao gerar etiqueta');
    await prisma.order.update({
      where: { id: orderId },
      data: { melhorEnvioStatus: 'generate_failed' },
    });
    return generateResult;
  }

  // 4. Obter URL de impressão
  const printResult = await printMelhorEnvioLabel([meOrderId]);
  
  // Usar tracking do checkout, ou do generate se disponível
  const finalTrackingCode = trackingCode || generateResult.trackingCode;
  const finalTrackingUrl = finalTrackingCode 
    ? `https://www.melhorrastreio.com.br/rastreio/${finalTrackingCode}` 
    : null;

  // Atualizar pedido com dados da etiqueta
  await prisma.order.update({
    where: { id: orderId },
    data: {
      melhorEnvioLabelId: meOrderId,
      melhorEnvioStatus: 'generated',
      melhorEnvioLabelUrl: printResult.url || null,
      trackingCode: finalTrackingCode || null,
      trackingUrl: finalTrackingUrl,
    },
  });

  console.log('[MELHOR_ENVIO] ========================================');
  console.log('[MELHOR_ENVIO] Etiqueta criada com sucesso!');
  console.log('[MELHOR_ENVIO] Tracking:', finalTrackingCode);
  console.log('[MELHOR_ENVIO] Tracking URL:', finalTrackingUrl);
  console.log('[MELHOR_ENVIO] Label URL:', printResult.url);
  console.log('[MELHOR_ENVIO] ========================================');

  return {
    success: true,
    orderId: meOrderId,
    labelId: meOrderId,
    trackingCode: finalTrackingCode,
    trackingUrl: finalTrackingUrl,
    labelUrl: printResult.url,
    status: 'generated',
  };
}
