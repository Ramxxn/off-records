'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageMembers } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/utils/audit';
import { AddMemberSchema } from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

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

export async function removeMember(workplaceMembershipId: number, organizationId: number) {
  const session = await verifySession();

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageMembers(ctx)) throw new Error('Forbidden');

  await db.orm.public.WorkplaceMembership
    .where({ id: workplaceMembershipId })
    .delete();

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'MEMBER_REMOVED',
    entityType: 'WorkplaceMembership',
    entityId: String(workplaceMembershipId),
  });

  revalidatePath(`/dashboard/organizations/${organizationId}`);
}

export async function grantAttendanceEditor(
  workplaceMembershipId: number,
  organizationId: number,
) {
  const session = await verifySession();

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageMembers(ctx)) throw new Error('Forbidden');

  const existing = await db.orm.public.AttendancePermission
    .where({ workplaceMembershipId })
    .select('id')
    .first();
  if (existing) return;

  await db.orm.public.AttendancePermission.create({
    workplaceMembershipId,
    grantedByMembershipId: ctx.membershipId,
  });

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'ATTENDANCE_EDITOR_GRANTED',
    entityType: 'AttendancePermission',
    entityId: String(workplaceMembershipId),
  });

  revalidatePath(`/dashboard/organizations/${organizationId}`);
}

export async function revokeAttendanceEditor(
  workplaceMembershipId: number,
  organizationId: number,
) {
  const session = await verifySession();

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageMembers(ctx)) throw new Error('Forbidden');

  await db.orm.public.AttendancePermission
    .where({ workplaceMembershipId })
    .delete();

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'ATTENDANCE_EDITOR_REVOKED',
    entityType: 'AttendancePermission',
    entityId: String(workplaceMembershipId),
  });

  revalidatePath(`/dashboard/organizations/${organizationId}`);
}
