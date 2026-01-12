import { prisma } from '@/lib/prisma';
import { 
  OrderStatus, 
  ReturnStatus, 
  orderStatusNotificationMessages, 
  returnStatusNotificationMessages 
} from '@/lib/i18n';

type NotificationType = 'ORDER_STATUS' | 'RETURN_STATUS' | 'PAYMENT' | 'PROMO';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Cria uma notificação para o usuário
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
      },
    });
    console.log('[NOTIFICATION] Criada:', notification.id, params.type, params.title);
    return notification;
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao criar:', error);
    return null;
  }
}

/**
 * Cria notificação para mudança de status de pedido
 */
export async function notifyOrderStatusChange(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  trackingCode?: string | null;
  trackingUrl?: string | null;
}) {
  const messages = orderStatusNotificationMessages[params.status];
  if (!messages) {
    console.warn('[NOTIFICATION] Status de pedido não reconhecido:', params.status);
    return null;
  }

  let message = messages.message;
  
  // Adicionar código de rastreio se disponível
  if (params.status === 'SHIPPED' && params.trackingCode) {
    message = `Seu pedido foi enviado! Código de rastreio: ${params.trackingCode}`;
  }

  return createNotification({
    userId: params.userId,
    type: 'ORDER_STATUS',
    title: `${messages.title} - #${params.orderNumber}`,
    message,
    data: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      status: params.status,
      trackingCode: params.trackingCode,
      trackingUrl: params.trackingUrl,
    },
  });
}

/**
 * Cria notificação para mudança de status de devolução
 */
export async function notifyReturnStatusChange(params: {
  userId: string;
  returnId: string;
  returnNumber: string;
  orderId: string;
  status: ReturnStatus;
  labelUrl?: string | null;
  trackingCode?: string | null;
  refundAmount?: number | null;
}) {
  const messages = returnStatusNotificationMessages[params.status];
  if (!messages) {
    console.warn('[NOTIFICATION] Status de devolução não reconhecido:', params.status);
    return null;
  }

  let message = messages.message;
  
  // Personalizar mensagem com dados específicos
  if (params.status === 'LABEL_GENERATED' && params.labelUrl) {
    message = 'A etiqueta de devolução foi gerada. Clique aqui para acessá-la.';
  }
  
  if (params.status === 'IN_TRANSIT' && params.trackingCode) {
    message = `O produto está a caminho. Código de rastreio: ${params.trackingCode}`;
  }
  
  if (params.status === 'REFUNDED' && params.refundAmount) {
    message = `O reembolso de R$ ${params.refundAmount.toFixed(2).replace('.', ',')} foi processado com sucesso!`;
  }

  return createNotification({
    userId: params.userId,
    type: 'RETURN_STATUS',
    title: `${messages.title} - #${params.returnNumber}`,
    message,
    data: {
      returnId: params.returnId,
      returnNumber: params.returnNumber,
      orderId: params.orderId,
      status: params.status,
      labelUrl: params.labelUrl,
      trackingCode: params.trackingCode,
      refundAmount: params.refundAmount,
    },
  });
}

/**
 * Cria notificação de pagamento
 */
export async function notifyPaymentStatus(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
  status: 'approved' | 'pending' | 'rejected' | 'refunded';
  amount?: number;
  paymentMethod?: string;
}) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    approved: {
      title: 'Pagamento Aprovado',
      message: `O pagamento do pedido #${params.orderNumber} foi aprovado!`,
    },
    pending: {
      title: 'Pagamento Pendente',
      message: `O pagamento do pedido #${params.orderNumber} está sendo processado.`,
    },
    rejected: {
      title: 'Pagamento Recusado',
      message: `O pagamento do pedido #${params.orderNumber} foi recusado. Tente novamente.`,
    },
    refunded: {
      title: 'Pagamento Estornado',
      message: params.amount 
        ? `O valor de R$ ${params.amount.toFixed(2).replace('.', ',')} foi estornado.`
        : `O pagamento do pedido #${params.orderNumber} foi estornado.`,
    },
  };

  const messages = statusMessages[params.status];
  if (!messages) return null;

  return createNotification({
    userId: params.userId,
    type: 'PAYMENT',
    title: messages.title,
    message: messages.message,
    data: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      paymentStatus: params.status,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
    },
  });
}

/**
 * Cria notificação promocional
 */
export async function notifyPromotion(params: {
  userId: string;
  title: string;
  message: string;
  promoCode?: string;
  expiresAt?: Date;
}) {
  return createNotification({
    userId: params.userId,
    type: 'PROMO',
    title: params.title,
    message: params.message,
    data: {
      promoCode: params.promoCode,
      expiresAt: params.expiresAt?.toISOString(),
    },
  });
}

/**
 * Marca notificações como lidas
 */
export async function markNotificationsAsRead(userId: string, notificationIds?: string[]) {
  try {
    if (notificationIds && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else {
      // Marca todas como lidas
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }
    return true;
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao marcar como lida:', error);
    return false;
  }
}

/**
 * Conta notificações não lidas
 */
export async function countUnreadNotifications(userId: string) {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao contar:', error);
    return 0;
  }
}
