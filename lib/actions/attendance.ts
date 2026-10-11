'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageAttendance } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/utils/audit';
import { UpsertAttendanceSchema } from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

export async function upsertAttendance(
  organizationId: number,
  workplaceId: number,
  attendanceId: number | null,
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const ctx = await getMemberContext(session.userId, organizationId, workplaceId);
  if (!ctx || !canManageAttendance(ctx)) {
    return { message: 'You do not have permission to manage attendance.' };
  }

  const parsed = UpsertAttendanceSchema.safeParse({
    workplaceMembershipId: formData.get('workplaceMembershipId'),
    checkInAt: formData.get('checkInAt'),
    checkOutAt: formData.get('checkOutAt') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { workplaceMembershipId, checkInAt, checkOutAt, notes } = parsed.data;

  if (attendanceId) {
    const existing = await db.orm.public.Attendance
      .where({ id: attendanceId, workplaceMembershipId })
      .select('checkInAt', 'checkOutAt', 'notes')
      .first();

    await db.orm.public.Attendance
      .where({ id: attendanceId })
      .update({
        checkInAt,
        checkOutAt: checkOutAt || null,
        notes: notes || null,
      });

    await writeAuditLog({
      organizationId,
      actorUserId: session.userId,
      action: 'ATTENDANCE_UPDATED',
      entityType: 'Attendance',
      entityId: String(attendanceId),
      details: JSON.stringify({ before: existing, after: { checkInAt, checkOutAt, notes } }),
    });
  } else {
    const record = await db.orm.public.Attendance.create({
      workplaceMembershipId,
      checkInAt,
      checkOutAt: checkOutAt || null,
      notes: notes || null,
    });

    await writeAuditLog({
      organizationId,
      actorUserId: session.userId,
      action: 'ATTENDANCE_CREATED',
      entityType: 'Attendance',
      entityId: String(record.id),
    });
  }

  revalidatePath(`/dashboard/organizations/${organizationId}/workplaces/${workplaceId}/attendance`);
  return { message: 'Attendance saved.' };
}

export async function deleteAttendance(
  attendanceId: number,
  organizationId: number,
  workplaceId: number,
) {
  const session = await verifySession();

  const ctx = await getMemberContext(session.userId, organizationId, workplaceId);
  if (!ctx || !canManageAttendance(ctx)) throw new Error('Forbidden');

  await db.orm.public.Attendance.where({ id: attendanceId }).delete();

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'ATTENDANCE_DELETED',
    entityType: 'Attendance',
    entityId: String(attendanceId),
  });

  revalidatePath(`/dashboard/organizations/${organizationId}/workplaces/${workplaceId}/attendance`);
}
