export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'QUOTE';

export type ReturnStatus =
  | 'REQUESTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'LABEL_GENERATED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'REJECTED'
  | 'CANCELLED';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'OWNER';

export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'PIX'
  | 'BOLETO'
  | 'CASH';

export const statusPt: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Em separação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
  QUOTE: 'Orçamento',
};

export const returnStatusPt: Record<ReturnStatus, string> = {
  REQUESTED: 'Solicitado',
  PENDING_REVIEW: 'Aguardando Análise',
  APPROVED: 'Aprovado',
  LABEL_GENERATED: 'Etiqueta Gerada',
  IN_TRANSIT: 'Em Trânsito',
  RECEIVED: 'Recebido',
  INSPECTING: 'Em Inspeção',
  REFUND_PENDING: 'Aguardando Reembolso',
  REFUNDED: 'Reembolsado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
};

export const rolePt: Record<UserRole, string> = {
  CUSTOMER: 'Cliente',
  ADMIN: 'Admin',
  OWNER: 'Dono',
};

export const paymentPt: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CASH: 'Dinheiro',
};

export function statusToPt(status?: string) {
  if (!status) return '';
  return (statusPt as any)[status] ?? status;
}

export function returnStatusToPt(status?: string) {
  if (!status) return '';
  return (returnStatusPt as any)[status] ?? status;
}

export function roleToPt(role?: string) {
  if (!role) return '';
  return (rolePt as any)[role] ?? role;
}

export function paymentToPt(method?: string) {
  if (!method) return '';
  return (paymentPt as any)[method] ?? method;
}

export function statusBadgeClass(status?: string) {
  switch (status) {
    case 'QUOTE':
      return 'bg-sky-100 text-sky-800';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'SHIPPED':
      return 'bg-indigo-100 text-indigo-800';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function returnStatusBadgeClass(status?: string) {
  switch (status) {
    case 'REQUESTED':
      return 'bg-yellow-100 text-yellow-800';
    case 'PENDING_REVIEW':
      return 'bg-orange-100 text-orange-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'LABEL_GENERATED':
      return 'bg-blue-100 text-blue-800';
    case 'IN_TRANSIT':
      return 'bg-indigo-100 text-indigo-800';
    case 'RECEIVED':
      return 'bg-cyan-100 text-cyan-800';
    case 'INSPECTING':
      return 'bg-purple-100 text-purple-800';
    case 'REFUND_PENDING':
      return 'bg-amber-100 text-amber-800';
    case 'REFUNDED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Mensagens de notificação para cada status de pedido
export const orderStatusNotificationMessages: Record<OrderStatus, { title: string; message: string }> = {
  PENDING: {
    title: 'Pedido Recebido',
    message: 'Seu pedido foi recebido e está aguardando pagamento.',
  },
  CONFIRMED: {
    title: 'Pagamento Confirmado',
    message: 'Seu pagamento foi confirmado! Estamos preparando seu pedido.',
  },
  PROCESSING: {
    title: 'Pedido em Separação',
    message: 'Seu pedido está sendo separado e será enviado em breve.',
  },
  SHIPPED: {
    title: 'Pedido Enviado',
    message: 'Seu pedido foi enviado! Em breve você receberá o código de rastreio.',
  },
  DELIVERED: {
    title: 'Pedido Entregue',
    message: 'Seu pedido foi entregue! Obrigado por comprar conosco.',
  },
  CANCELLED: {
    title: 'Pedido Cancelado',
    message: 'Seu pedido foi cancelado.',
  },
  REFUNDED: {
    title: 'Reembolso Processado',
    message: 'O reembolso do seu pedido foi processado.',
  },
  QUOTE: {
    title: 'Orçamento Criado',
    message: 'Seu orçamento foi criado e está aguardando aprovação.',
  },
};

// Mensagens de notificação para cada status de devolução
export const returnStatusNotificationMessages: Record<ReturnStatus, { title: string; message: string }> = {
  REQUESTED: {
    title: 'Devolução Solicitada',
    message: 'Sua solicitação de devolução foi recebida e está em análise.',
  },
  PENDING_REVIEW: {
    title: 'Devolução em Análise',
    message: 'Nossa equipe está analisando sua solicitação de devolução.',
  },
  APPROVED: {
    title: 'Devolução Aprovada',
    message: 'Sua devolução foi aprovada! Aguarde a geração da etiqueta de envio.',
  },
  LABEL_GENERATED: {
    title: 'Etiqueta Gerada',
    message: 'A etiqueta de devolução foi gerada. Acesse sua conta para imprimi-la.',
  },
  IN_TRANSIT: {
    title: 'Produto em Trânsito',
    message: 'O produto está a caminho de nossa loja.',
  },
  RECEIVED: {
    title: 'Produto Recebido',
    message: 'Recebemos o produto devolvido e iniciaremos a inspeção.',
  },
  INSPECTING: {
    title: 'Produto em Inspeção',
    message: 'O produto está sendo inspecionado por nossa equipe.',
  },
  REFUND_PENDING: {
    title: 'Aguardando Reembolso',
    message: 'A inspeção foi concluída e o reembolso está sendo processado.',
  },
  REFUNDED: {
    title: 'Reembolso Concluído',
    message: 'O reembolso foi processado com sucesso!',
  },
  REJECTED: {
    title: 'Devolução Rejeitada',
    message: 'Infelizmente sua devolução não foi aprovada. Verifique os detalhes.',
  },
  CANCELLED: {
    title: 'Devolução Cancelada',
    message: 'A solicitação de devolução foi cancelada.',
  },
};
