export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'QUOTE';

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
