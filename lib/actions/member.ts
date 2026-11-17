'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageMembers } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/utils/audit';
import { AddMemberSchema, WorkplaceMemberActionSchema } from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

function memberActionError(message: string): ActionState {
  return { message };
}

export async function addMember(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const parsed = AddMemberSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    organizationId: formData.get('organizationId'),
    workplaceId: formData.get('workplaceId'),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { email, role, organizationId, workplaceId } = parsed.data;

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageMembers(ctx)) {
    return { message: 'Only owners can add members.' };
  }

  const targetUser = await db.orm.public.User.where({ email }).select('id', 'name').first();
  if (!targetUser) return { errors: { email: ['No user found with this email.'] } };

  let membership = await db.orm.public.Membership
    .where({ userId: targetUser.id, organizationId })
    .select('id', 'role')
    .first();

  if (!membership) {
    membership = await db.orm.public.Membership.create({
      userId: targetUser.id,
      organizationId,
      role,
    });
  }

  const existingWm = await db.orm.public.WorkplaceMembership
    .where({ membershipId: membership.id, workplaceId })
    .select('id')
    .first();

  if (existingWm) {
    return { errors: { email: ['This user is already a member of this workplace.'] } };
  }

  await db.orm.public.WorkplaceMembership.create({
    membershipId: membership.id,
    workplaceId,
    organizationId,
  });

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'MEMBER_ADDED',
    entityType: 'WorkplaceMembership',
    details: `Added ${email} as ${role} to workplace ${workplaceId}`,
  });

  revalidatePath(`/dashboard/organizations/${organizationId}/workplaces/${workplaceId}`);
  return { message: 'Member added successfully.' };
}

export async function removeMember(
  workplaceMembershipId: number,
  organizationId: number,
): Promise<ActionState> {
  const session = await verifySession();
  const parsed = WorkplaceMemberActionSchema.safeParse({ workplaceMembershipId, organizationId });
  if (!parsed.success) return memberActionError('Invalid member selection.');

  const { workplaceMembershipId: targetId, organizationId: orgId } = parsed.data;
  const ctx = await getMemberContext(session.userId, orgId);
  if (!ctx || !canManageMembers(ctx)) return memberActionError('Forbidden.');

  const target = await db.orm.public.WorkplaceMembership
    .where({ id: targetId, organizationId: orgId })
    .select('id', 'workplaceId')
    .first();
  if (!target) return memberActionError('Member not found.');

  await db.orm.public.WorkplaceMembership
    .where({ id: target.id, organizationId: orgId })
    .delete();

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.userId,
    action: 'MEMBER_REMOVED',
    entityType: 'WorkplaceMembership',
    entityId: String(target.id),
  });

  revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${target.workplaceId}`);
  return { message: 'Member removed.' };
}

export async function grantAttendanceEditor(
  workplaceMembershipId: number,
  organizationId: number,
): Promise<ActionState> {
  const session = await verifySession();
  const parsed = WorkplaceMemberActionSchema.safeParse({ workplaceMembershipId, organizationId });
  if (!parsed.success) return memberActionError('Invalid member selection.');

  const { workplaceMembershipId: targetId, organizationId: orgId } = parsed.data;
  const ctx = await getMemberContext(session.userId, orgId);
  if (!ctx || !canManageMembers(ctx)) return memberActionError('Forbidden.');

  const target = await db.orm.public.WorkplaceMembership
    .where({ id: targetId, organizationId: orgId })
    .select('id', 'workplaceId')
    .first();
  if (!target) return memberActionError('Member not found.');

  const existing = await db.orm.public.AttendancePermission
    .where({ workplaceMembershipId: target.id })
    .select('id')
    .first();
  if (existing) return { message: 'Attendance Editor is already enabled.' };

  await db.orm.public.AttendancePermission.create({
    workplaceMembershipId: target.id,
    grantedByMembershipId: ctx.membershipId,
  });

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'ATTENDANCE_EDITOR_GRANTED',
    entityType: 'AttendancePermission',
    entityId: String(target.id),
  });

  revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${target.workplaceId}`);
  return { message: 'Attendance Editor enabled.' };
}

export async function revokeAttendanceEditor(
  workplaceMembershipId: number,
  organizationId: number,
): Promise<ActionState> {
  const session = await verifySession();
  const parsed = WorkplaceMemberActionSchema.safeParse({ workplaceMembershipId, organizationId });
  if (!parsed.success) return memberActionError('Invalid member selection.');

  const { workplaceMembershipId: targetId, organizationId: orgId } = parsed.data;
  const ctx = await getMemberContext(session.userId, orgId);
  if (!ctx || !canManageMembers(ctx)) return memberActionError('Forbidden.');

  const target = await db.orm.public.WorkplaceMembership
    .where({ id: targetId, organizationId: orgId })
    .select('id', 'workplaceId')
    .first();
  if (!target) return memberActionError('Member not found.');

  const permission = await db.orm.public.AttendancePermission
    .where({ workplaceMembershipId: target.id })
    .select('id')
    .first();
  if (!permission) return { message: 'Attendance Editor is already disabled.' };

  await db.orm.public.AttendancePermission
    .where({ id: permission.id, workplaceMembershipId: target.id })
    .delete();

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.userId,
    action: 'ATTENDANCE_EDITOR_REVOKED',
    entityType: 'AttendancePermission',
    entityId: String(target.id),
  });

  revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${target.workplaceId}`);
  return { message: 'Attendance Editor disabled.' };
}
