'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageAttendance } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/utils/audit';
import {
  AttendanceDeleteSchema,
  UpsertAttendanceSchema,
} from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

const positiveId = (value: number) => Number.isSafeInteger(value) && value > 0;

export async function upsertAttendance(
  organizationId: number,
  workplaceId: number,
  attendanceId: number | null,
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();
  if (
    !positiveId(organizationId) ||
    !positiveId(workplaceId) ||
    (attendanceId !== null && !positiveId(attendanceId))
  ) {
    return { message: 'Invalid attendance selection.' };
  }

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
  const workplaceMember = await db.orm.public.WorkplaceMembership
    .where({ id: workplaceMembershipId, organizationId, workplaceId })
    .select('id')
    .first();
  if (!workplaceMember) return { message: 'Employee is not a member of this workplace.' };

  if (attendanceId) {
    const existing = await db.orm.public.Attendance
      .where({ id: attendanceId, workplaceMembershipId: workplaceMember.id })
      .select('checkInAt', 'checkOutAt', 'notes')
      .first();
    if (!existing) return { message: 'Attendance record not found.' };

    await db.orm.public.Attendance
      .where({ id: attendanceId, workplaceMembershipId: workplaceMember.id })
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
  const parsed = AttendanceDeleteSchema.safeParse({ attendanceId, organizationId, workplaceId });
  if (!parsed.success) throw new Error('Invalid attendance selection.');

  const {
    attendanceId: targetAttendanceId,
    organizationId: orgId,
    workplaceId: wpId,
  } = parsed.data;
  const ctx = await getMemberContext(session.userId, orgId, wpId);
  if (!ctx || !canManageAttendance(ctx)) throw new Error('Forbidden');

  const attendance = await db.orm.public.Attendance
    .where({ id: targetAttendanceId })
    .select('workplaceMembershipId')
    .first();
  if (!attendance) throw new Error('Attendance record not found.');

  const workplaceMember = await db.orm.public.WorkplaceMembership
    .where({
      id: attendance.workplaceMembershipId,
      organizationId: orgId,
      workplaceId: wpId,
    })
    .select('id')
    .first();
  if (!workplaceMember) throw new Error('Attendance record not found.');

  await db.orm.public.Attendance
    .where({ id: targetAttendanceId, workplaceMembershipId: workplaceMember.id })
    .delete();

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.userId,
    action: 'ATTENDANCE_DELETED',
    entityType: 'Attendance',
    entityId: String(targetAttendanceId),
  });

  revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${wpId}/attendance`);
}
