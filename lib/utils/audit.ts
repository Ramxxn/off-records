import 'server-only';
import { db } from '@/prisma/db';

export async function writeAuditLog(params: {
  organizationId: number;
  actorUserId?: number;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  await db.orm.public.AuditLog.create({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    details: params.details ?? null,
  });
}
