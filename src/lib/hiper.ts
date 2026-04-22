import logger from './logger';

const BASE_URL = 'https://ms-ecommerce.hiper.com.br/api/v1';

// ── Token cache ───────────────────────────────────────────────────────────────

let _token: string | null = null;
let _tokenExpiresAt = 0;

async function getToken(): Promise<string | null> {
  if (_token && Date.now() < _tokenExpiresAt) return _token;

  const key = process.env.HIPER_API_SECRET_KEY;
  if (!key) {
    logger.error('[HIPER] HIPER_API_SECRET_KEY não configurada');
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/gerar-token/${key}`);
    const data = await res.json();

    logger.info({ tokenFields: Object.keys(data), hasToken: !!data.token, errors: data.errors }, '[HIPER] Resposta auth');

    if (!res.ok || data.errors?.length || !data.token) {
      logger.error({ data }, '[HIPER] Falha ao obter token');
      return null;
    }

    _token = data.token as string;
    _tokenExpiresAt = Date.now() + 5.5 * 60 * 60 * 1000; // 5.5 horas
    logger.info('[HIPER] Token obtido com sucesso (primeiros 30 chars: %s...)', _token.slice(0, 30));
    return _token;
  } catch (err) {
    logger.error(err as Error, '[HIPER] Exceção ao obter token');
    return null;
  }
}

function authHeaders(token: string, includeContentType = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (includeContentType) h['Content-Type'] = 'application/json';
  return h;
}

// ── Mapeamento de métodos de pagamento ────────────────────────────────────────

const PAYMENT_ID: Record<string, number> = {
  CREDIT_CARD: 4,
  DEBIT_CARD: 5,
  PIX: 12,
  BOLETO: 6,
  CASH: 1,
};

// ── IBGE lookup via ViaCEP ────────────────────────────────────────────────────

const _ibgeCache: Record<string, number> = {};

async function getIbge(cep: string): Promise<number> {
  const clean = cep.replace(/\D/g, '');
  if (_ibgeCache[clean]) return _ibgeCache[clean];
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return 0;
    const data = await res.json();
    const code = Number(data.ibge) || 0;
    if (code) _ibgeCache[clean] = code;
    return code;
  } catch {
    return 0;
  }
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export async function getHiperProducts(pontoDeSincronizacao = 0): Promise<any[] | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${BASE_URL}/produtos/pontoDeSincronizacao?pontoDeSincronizacao=${pontoDeSincronizacao}`,
      { headers: authHeaders(token) },
    );

    const text = await res.text();
    const data = JSON.parse(text);

    if (!res.ok) {
      const erros: string[] = data.errors ?? [];
      if (erros.some((e: string) => e.toLowerCase().includes('nenhum produto'))) {
        logger.warn('[HIPER] Nenhum produto configurado para sincronização no Hiper Gestão');
        return [];
      }
      logger.error('[HIPER] Erro ao buscar produtos: %d — %s', res.status, text.slice(0, 300));
      return null;
    }

    const produtos = data.produtos ?? data.data ?? data;
    return Array.isArray(produtos) ? produtos : [];
  } catch (err) {
    logger.error(err as Error, '[HIPER] Exceção ao buscar produtos');
    return null;
  }
}

// ── Estoque ───────────────────────────────────────────────────────────────────

export async function getHiperStock(produtoId: string): Promise<any | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${BASE_URL}/estoques/pontoDeSincronizacao?ProdutoId=${produtoId}`,
      { headers: authHeaders(token) },
    );

    if (!res.ok) {
      logger.error('[HIPER] Erro ao buscar estoque para %s: %d', produtoId, res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    logger.error(err as Error, '[HIPER] Exceção ao buscar estoque');
    return null;
  }
}

// ── Pedido de Venda ───────────────────────────────────────────────────────────

export type HiperOrderInput = {
  orderNumber: string;
  total: number;
  shipping: number;
  installments: number;
  paymentMethod: string;
  customer: {
    name: string;
    email: string;
    cpf: string;
  };
  address: {
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  items: Array<{
    hiperProductId: string;
    quantity: number;
    unitPrice: number;
    netPrice: number;
  }>;
};

export type HiperOrderResult = {
  success: boolean;
  hiperOrderId?: string;
  error?: string;
};

export async function createHiperOrder(input: HiperOrderInput): Promise<HiperOrderResult> {
  const token = await getToken();
  if (!token) return { success: false, error: 'Token não disponível' };

  const ibge = await getIbge(input.address.zip);

  const endereco = {
    bairro: input.address.neighborhood,
    cep: input.address.zip.replace(/\D/g, ''),
    codigoIbge: ibge,
    complemento: input.address.complement || '',
    logradouro: input.address.street,
    numero: input.address.number,
  };

  const body: Record<string, any> = {
    cliente: {
      documento: input.customer.cpf.replace(/\D/g, ''),
      email: input.customer.email,
      inscricaoEstadual: '',
      nomeDoCliente: input.customer.name,
      nomeFantasia: '',
    },
    enderecoDeCobranca: endereco,
    enderecoDeEntrega: endereco,
    itens: input.items.map((item) => ({
      produtoId: item.hiperProductId,
      quantidade: item.quantity,
      precoUnitarioBruto: item.unitPrice,
      precoUnitarioLiquido: item.netPrice,
    })),
    meiosDePagamento: [
      {
        idMeioDePagamento: PAYMENT_ID[input.paymentMethod] ?? 12,
        parcelas: input.installments || 1,
        valor: input.total,
      },
    ],
    numeroPedidoDeVenda: input.orderNumber,
    observacaoDoPedidoDeVenda: '',
    valorDoFrete: input.shipping,
  };

  // CNPJ do marketplace — necessário para estabelecimentos em SC
  if (process.env.HIPER_MARKETPLACE_CNPJ) {
    body.Marketplace = {
      Cnpj: process.env.HIPER_MARKETPLACE_CNPJ,
      Nome: process.env.HIPER_MARKETPLACE_NAME || 'Loja Virtual',
    };
  }

  try {
    logger.info('[HIPER] Enviando pedido %s', input.orderNumber);

    const res = await fetch(`${BASE_URL}/pedido-de-venda/`, {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || data.errors?.length) {
      const error = data.message || data.errors?.join(', ') || `Erro ${res.status}`;
      logger.error('[HIPER] Erro ao criar pedido %s: %s', input.orderNumber, error);
      return { success: false, error };
    }

    logger.info('[HIPER] Pedido criado: %s → hiper:%s', input.orderNumber, data.id);
    return { success: true, hiperOrderId: data.id };
  } catch (err: any) {
    logger.error(err as Error, '[HIPER] Exceção ao criar pedido');
    return { success: false, error: err.message };
  }
}

export async function getHiperOrder(hiperOrderId: string): Promise<any | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${BASE_URL}/pedido-de-venda/eventos/${hiperOrderId}`,
      { headers: authHeaders(token) },
    );

    if (!res.ok) {
      logger.error('[HIPER] Erro ao consultar pedido %s: %d', hiperOrderId, res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    logger.error(err as Error, '[HIPER] Exceção ao consultar pedido');
    return null;
  }
}

export async function cancelHiperOrder(hiperOrderId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getToken();
  if (!token) return { success: false, error: 'Token não disponível' };

  try {
    const res = await fetch(`${BASE_URL}/pedido-de-venda/cancelar/${hiperOrderId}`, {
      method: 'PUT',
      headers: authHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.errors?.length) {
      const error = data.message || `Erro ${res.status}`;
      logger.error('[HIPER] Erro ao cancelar pedido %s: %s', hiperOrderId, error);
      return { success: false, error };
    }

    logger.info('[HIPER] Pedido cancelado no Hiper: %s', hiperOrderId);
    return { success: true };
  } catch (err: any) {
    logger.error(err as Error, '[HIPER] Exceção ao cancelar pedido');
    return { success: false, error: err.message };
  }
}
