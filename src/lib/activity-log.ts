import { prisma } from './prisma';
import logger from './logger';

export type ActivityAction =
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_DELETED'
  | 'ACCOUNT_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'DATA_EXPORTED'
  | 'ORDER_CREATED'
  | 'ORDER_CANCELLED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ADDRESS_UPDATED'
  | 'CONSENT_UPDATED';

/**
 * Grava um registro de auditoria em ActivityLog.
 * Fire-and-forget: nunca lança exceção — falha silenciosa com log de erro.
 */
export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  changes,
}: {
  userId: string;
  action: ActivityAction;
  entity: string;
  entityId: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changes: changes as any,
      },
    });
  } catch (err) {
    // Nunca deixar falha de auditoria derrubar a operação principal
    logger.error(err as Error, '[ACTIVITY_LOG] Falha ao gravar log de atividade');
  }
}
