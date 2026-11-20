'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageAttendance } from '@/lib/permissions';
import {
  AttendanceSelfActionSchema,
  AttendanceDeleteSchema,
  UpsertAttendanceSchema,
} from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

const positiveId = (value: number) => Number.isSafeInteger(value) && value > 0;

function normalizeUtcDateTimeInput(value: FormDataEntryValue | null) {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  ) {
    return `${value}:00.000Z`;
  }
  return value;
}

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
    checkInAt: normalizeUtcDateTimeInput(formData.get('checkInAt')),
    checkOutAt: normalizeUtcDateTimeInput(formData.get('checkOutAt')) || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { workplaceMembershipId, checkInAt, checkOutAt, notes } = parsed.data;
  const workplaceMember = await db.orm.public.WorkplaceMembership
    .where({ id: workplaceMembershipId, organizationId, workplaceId })
    .select('id')
    .first();
  if (!workplaceMember) return { message: 'Employee is not a member of this workplace.' };

  const result = await db.transaction(async (tx) => {
    const lockedMember = await tx.orm.public.WorkplaceMembership
      .where({
        id: workplaceMember.id,
        organizationId,
        workplaceId,
      })
      .forNoKeyUpdate()
      .select('id')
      .first();
    if (!lockedMember) {
      return { saved: false, message: 'Employee is not a member of this workplace.' };
    }

    const current = attendanceId
      ? await tx.orm.public.Attendance
          .where({ id: attendanceId, workplaceMembershipId: lockedMember.id })
          .select('checkInAt', 'checkOutAt', 'notes')
          .first()
      : null;
    if (attendanceId && !current) {
      return { saved: false, message: 'Attendance record not found.' };
    }

    if (!checkOutAt) {
      const active = await tx.orm.public.Attendance
        .where({ workplaceMembershipId: lockedMember.id, checkOutAt: null })
        .select('id')
        .first();
      if (active && active.id !== attendanceId) {
        return { saved: false, message: 'This employee already has an open attendance record.' };
      }
    }

    if (attendanceId) {
      await tx.orm.public.Attendance
        .where({ id: attendanceId, workplaceMembershipId: lockedMember.id })
        .update({
          checkInAt,
          checkOutAt: checkOutAt || null,
          notes: notes || null,
        });

      await tx.orm.public.AuditLog.create({
        organizationId,
        actorUserId: session.userId,
        action: 'ATTENDANCE_UPDATED',
        entityType: 'Attendance',
        entityId: String(attendanceId),
        details: JSON.stringify({
          before: current,
          after: { checkInAt, checkOutAt, notes },
        }),
      });
    } else {
      const record = await tx.orm.public.Attendance.create({
        workplaceMembershipId: lockedMember.id,
        checkInAt,
        checkOutAt: checkOutAt || null,
        notes: notes || null,
      });

      await tx.orm.public.AuditLog.create({
        organizationId,
        actorUserId: session.userId,
        action: 'ATTENDANCE_CREATED',
        entityType: 'Attendance',
        entityId: String(record.id),
      });
    }

    return { saved: true, message: 'Attendance saved.' };
  });

  if (result.saved) {
    revalidatePath(`/dashboard/organizations/${organizationId}/workplaces/${workplaceId}/attendance`);
  }
  return { message: result.message };
}

async function updateSelfAttendance(
  formData: FormData,
  action: 'CHECK_IN' | 'CHECK_OUT',
): Promise<ActionState> {
  const session = await verifySession();
  const parsed = AttendanceSelfActionSchema.safeParse({
    organizationId: formData.get('organizationId'),
    workplaceId: formData.get('workplaceId'),
  });
  if (!parsed.success) return { message: 'Invalid workplace selection.' };

  const { organizationId, workplaceId } = parsed.data;
  const ctx = await getMemberContext(session.userId, organizationId, workplaceId);
  if (!ctx?.workplaceMembershipId) {
    return { message: 'You must be a workplace member to record your attendance.' };
  }

  const now = new Date().toISOString();
  const result = await db.transaction(async (tx) => {
    const workplaceMember = await tx.orm.public.WorkplaceMembership
      .where({
        id: ctx.workplaceMembershipId,
        organizationId,
        workplaceId,
      })
      .forNoKeyUpdate()
      .select('id')
      .first();
    if (!workplaceMember) return { changed: false, message: 'Workplace membership was not found.' };

    const activeRecords = await tx.orm.public.Attendance
      .where({ workplaceMembershipId: workplaceMember.id, checkOutAt: null })
      .orderBy((attendance) => attendance.id.desc())
      .limit(2)
      .all();

    if (activeRecords.length > 1) {
      return {
        changed: false,
        message: 'Multiple open attendance records need manager review before you can continue.',
      };
    }

    if (action === 'CHECK_IN') {
      if (activeRecords.length > 0) {
        return { changed: false, message: 'You are already checked in.' };
      }

      const attendance = await tx.orm.public.Attendance.create({
        workplaceMembershipId: workplaceMember.id,
        checkInAt: now,
      });
      await tx.orm.public.AuditLog.create({
        organizationId,
        actorUserId: session.userId,
        action: 'ATTENDANCE_CHECKED_IN',
        entityType: 'Attendance',
        entityId: String(attendance.id),
      });
      return { changed: true, message: 'You are checked in.' };
    }

    const active = activeRecords[0];
    if (!active) return { changed: false, message: 'You do not have an open check-in.' };

    await tx.orm.public.Attendance
      .where({ id: active.id, workplaceMembershipId: workplaceMember.id })
      .update({ checkOutAt: now });
    await tx.orm.public.AuditLog.create({
      organizationId,
      actorUserId: session.userId,
      action: 'ATTENDANCE_CHECKED_OUT',
      entityType: 'Attendance',
      entityId: String(active.id),
    });
    return { changed: true, message: 'You are checked out.' };
  });

  if (result.changed) {
    revalidatePath(`/dashboard/organizations/${organizationId}/workplaces/${workplaceId}/attendance`);
  }
  return { message: result.message };
}

export async function checkInAttendance(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return updateSelfAttendance(formData, 'CHECK_IN');
}

export async function checkOutAttendance(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return updateSelfAttendance(formData, 'CHECK_OUT');
}

export async function deleteAttendance(
  attendanceId: number,
  organizationId: number,
  workplaceId: number,
): Promise<ActionState> {
  const session = await verifySession();
  const parsed = AttendanceDeleteSchema.safeParse({ attendanceId, organizationId, workplaceId });
  if (!parsed.success) return { message: 'Invalid attendance selection.' };

  const {
    attendanceId: targetAttendanceId,
    organizationId: orgId,
    workplaceId: wpId,
  } = parsed.data;
  const ctx = await getMemberContext(session.userId, orgId, wpId);
  if (!ctx || !canManageAttendance(ctx)) {
    return { message: 'You do not have permission to manage attendance.' };
  }

  const result = await db.transaction(async (tx) => {
    const attendance = await tx.orm.public.Attendance
      .where({ id: targetAttendanceId })
      .select('workplaceMembershipId')
      .first();
    if (!attendance) return { deleted: false, message: 'Attendance record not found.' };

    const workplaceMember = await tx.orm.public.WorkplaceMembership
      .where({
        id: attendance.workplaceMembershipId,
        organizationId: orgId,
        workplaceId: wpId,
      })
      .forNoKeyUpdate()
      .select('id')
      .first();
    if (!workplaceMember) {
      return { deleted: false, message: 'Attendance record not found.' };
    }

    await tx.orm.public.Attendance
      .where({ id: targetAttendanceId, workplaceMembershipId: workplaceMember.id })
      .delete();

    await tx.orm.public.AuditLog.create({
      organizationId: orgId,
      actorUserId: session.userId,
      action: 'ATTENDANCE_DELETED',
      entityType: 'Attendance',
      entityId: String(targetAttendanceId),
    });

    return { deleted: true, message: 'Attendance record deleted.' };
  });

  if (result.deleted) {
    revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${wpId}/attendance`);
  }
  return { message: result.message };
}
