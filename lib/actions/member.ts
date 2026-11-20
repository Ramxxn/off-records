'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageMembers } from '@/lib/permissions';
import {
  AddMemberSchema,
  OrganizationMemberRoleSchema,
  WorkplaceMemberActionSchema,
} from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

function memberActionError(message: string): ActionState {
  return { message };
}

export async function addMember(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const parsed = AddMemberSchema.safeParse({
    email: formData.get('email'),
    organizationId: formData.get('organizationId'),
    workplaceId: formData.get('workplaceId'),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { email, organizationId, workplaceId } = parsed.data;

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageMembers(ctx)) {
    return { errors: { form: ['Only owners can add members.'] } };
  }

  const workplace = await db.orm.public.Workplace
    .where({ id: workplaceId, organizationId })
    .select('id')
    .first();
  if (!workplace) {
    return { errors: { form: ['Workplace not found in this organization.'] } };
  }

  const targetUser = await db.orm.public.User.where({ email }).select('id').first();
  if (!targetUser) {
    return { errors: { email: ['No existing account was found. Invitations are not available yet.'] } };
  }

  const result = await db.transaction(async (tx) => {
    const organization = await tx.orm.public.Organization
      .where({ id: organizationId })
      .forNoKeyUpdate()
      .select('id')
      .first();
    if (!organization) return { added: false, message: 'Organization not found.' };

    const lockedWorkplace = await tx.orm.public.Workplace
      .where({ id: workplaceId, organizationId })
      .select('id')
      .first();
    if (!lockedWorkplace) {
      return { added: false, message: 'Workplace not found in this organization.' };
    }

    let membership = await tx.orm.public.Membership
      .where({ userId: targetUser.id, organizationId })
      .select('id')
      .first();
    if (!membership) {
      membership = await tx.orm.public.Membership.create({
        userId: targetUser.id,
        organizationId,
        role: 'EMPLOYEE',
      });
    }

    const existingWorkplaceMembership = await tx.orm.public.WorkplaceMembership
      .where({ membershipId: membership.id, workplaceId, organizationId })
      .select('id')
      .first();
    if (existingWorkplaceMembership) {
      return { added: false, message: 'This user is already a member of this workplace.' };
    }

    const workplaceMembership = await tx.orm.public.WorkplaceMembership.create({
      membershipId: membership.id,
      workplaceId,
      organizationId,
    });

    await tx.orm.public.AuditLog.create({
      organizationId,
      actorUserId: session.userId,
      action: 'MEMBER_ADDED',
      entityType: 'WorkplaceMembership',
      entityId: String(workplaceMembership.id),
      details: `Added ${email} to workplace ${workplaceId}`,
    });

    return { added: true, message: 'Member added successfully.' };
  });

  if (!result.added) return { errors: { form: [result.message] } };
  revalidatePath(`/dashboard/organizations/${organizationId}`);
  revalidatePath(`/dashboard/organizations/${organizationId}/workplaces/${workplaceId}`);
  return { message: result.message };
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

  const result = await db.transaction(async (tx) => {
    const target = await tx.orm.public.WorkplaceMembership
      .where({ id: targetId, organizationId: orgId })
      .forNoKeyUpdate()
      .select('id', 'workplaceId')
      .first();
    if (!target) return { removed: false, message: 'Member not found.' };

    await tx.orm.public.WorkplaceMembership
      .where({ id: target.id, organizationId: orgId })
      .delete();

    await tx.orm.public.AuditLog.create({
      organizationId: orgId,
      actorUserId: session.userId,
      action: 'MEMBER_REMOVED',
      entityType: 'WorkplaceMembership',
      entityId: String(target.id),
      details: `Removed from workplace ${target.workplaceId}.`,
    });

    return {
      removed: true,
      workplaceId: target.workplaceId,
      message: 'Member removed from the workplace.',
    };
  });

  if (result.removed) {
    revalidatePath(`/dashboard/organizations/${orgId}`);
    revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${result.workplaceId}`);
  }
  return { message: result.message };
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

  const result = await db.transaction(async (tx) => {
    const target = await tx.orm.public.WorkplaceMembership
      .where({ id: targetId, organizationId: orgId })
      .forNoKeyUpdate()
      .select('id', 'workplaceId')
      .first();
    if (!target) return { changed: false, message: 'Member not found.' };

    const existing = await tx.orm.public.AttendancePermission
      .where({ workplaceMembershipId: target.id })
      .select('id')
      .first();
    if (existing) return { changed: false, message: 'Attendance Editor is already enabled.' };

    await tx.orm.public.AttendancePermission.create({
      workplaceMembershipId: target.id,
      grantedByMembershipId: ctx.membershipId,
    });

    await tx.orm.public.AuditLog.create({
      organizationId: orgId,
      actorUserId: session.userId,
      action: 'ATTENDANCE_EDITOR_GRANTED',
      entityType: 'AttendancePermission',
      entityId: String(target.id),
    });

    return {
      changed: true,
      workplaceId: target.workplaceId,
      message: 'Attendance Editor enabled.',
    };
  });

  if (result.changed) {
    revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${result.workplaceId}`);
  }
  return { message: result.message };
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

  const result = await db.transaction(async (tx) => {
    const target = await tx.orm.public.WorkplaceMembership
      .where({ id: targetId, organizationId: orgId })
      .forNoKeyUpdate()
      .select('id', 'workplaceId')
      .first();
    if (!target) return { changed: false, message: 'Member not found.' };

    const permission = await tx.orm.public.AttendancePermission
      .where({ workplaceMembershipId: target.id })
      .select('id')
      .first();
    if (!permission) {
      return { changed: false, message: 'Attendance Editor is already disabled.' };
    }

    await tx.orm.public.AttendancePermission
      .where({ id: permission.id, workplaceMembershipId: target.id })
      .delete();

    await tx.orm.public.AuditLog.create({
      organizationId: orgId,
      actorUserId: session.userId,
      action: 'ATTENDANCE_EDITOR_REVOKED',
      entityType: 'AttendancePermission',
      entityId: String(target.id),
    });

    return {
      changed: true,
      workplaceId: target.workplaceId,
      message: 'Attendance Editor disabled.',
    };
  });

  if (result.changed) {
    revalidatePath(`/dashboard/organizations/${orgId}/workplaces/${result.workplaceId}`);
  }
  return { message: result.message };
}

export async function updateOrganizationMemberRole(
  membershipId: number,
  organizationId: number,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();
  const parsed = OrganizationMemberRoleSchema.safeParse({
    membershipId,
    organizationId,
    role: formData.get('role'),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const {
    membershipId: targetId,
    organizationId: orgId,
    role,
  } = parsed.data;
  const ctx = await getMemberContext(session.userId, orgId);
  if (!ctx || !canManageMembers(ctx)) return memberActionError('Forbidden.');

  const result = await db.transaction(async (tx) => {
    const organization = await tx.orm.public.Organization
      .where({ id: orgId })
      .forNoKeyUpdate()
      .select('id')
      .first();
    if (!organization) return { changed: false, message: 'Organization not found.' };

    const target = await tx.orm.public.Membership
      .where({ id: targetId, organizationId: orgId })
      .select('id', 'role')
      .first();
    if (!target) return { changed: false, message: 'Member not found.' };
    if (target.role === role) return { changed: false, message: 'Role is unchanged.' };

    if (target.role === 'OWNER' && role !== 'OWNER') {
      const members = await tx.orm.public.Membership
        .where({ organizationId: orgId })
        .select('role')
        .all();
      const ownerCount = members.filter((member) => member.role === 'OWNER').length;
      if (ownerCount <= 1) {
        return { changed: false, message: 'An organization must have at least one owner.' };
      }
    }

    await tx.orm.public.Membership
      .where({ id: target.id, organizationId: orgId })
      .update({ role });
    await tx.orm.public.AuditLog.create({
      organizationId: orgId,
      actorUserId: session.userId,
      action: 'MEMBER_ROLE_UPDATED',
      entityType: 'Membership',
      entityId: String(target.id),
      details: JSON.stringify({ before: target.role, after: role }),
    });
    return { changed: true, message: 'Member role updated.' };
  });

  if (result.changed) revalidatePath(`/dashboard/organizations/${orgId}`);
  return { message: result.message };
}
