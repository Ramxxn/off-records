import 'server-only';
import { db } from '@/prisma/db';

export type MemberContext = {
  membershipId: number;
  organizationId: number;
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  workplaceMembershipId: number | null;
  isAttendanceEditor: boolean;
};

export async function getMemberContext(
  userId: number,
  organizationId: number,
  workplaceId?: number,
): Promise<MemberContext | null> {
  const membership = await db.orm.public.Membership
    .where({ userId, organizationId })
    .select('id', 'role')
    .first();

  if (!membership) return null;

  let workplaceMembershipId: number | null = null;
  let isAttendanceEditor = false;
  if (workplaceId !== undefined) {
    const workplaceMembership = await db.orm.public.WorkplaceMembership
      .where({ membershipId: membership.id, workplaceId, organizationId })
      .select('id')
      .first();
    workplaceMembershipId = workplaceMembership?.id ?? null;

    if (!workplaceMembership && membership.role === 'EMPLOYEE') return null;

    if (workplaceMembership) {
      const perm = await db.orm.public.AttendancePermission
        .where({ workplaceMembershipId: workplaceMembership.id })
        .select('id')
        .first();
      isAttendanceEditor = !!perm;
    }
  }

  return {
    membershipId: membership.id,
    organizationId,
    role: membership.role as MemberContext['role'],
    workplaceMembershipId,
    isAttendanceEditor,
  };
}

export function canManageAttendance(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'MANAGER' || ctx.isAttendanceEditor;
}

export function canManageMembers(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER';
}

export function canViewOrganizationMembers(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'MANAGER';
}

export function canViewAuditLogs(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'MANAGER';
}

export function canViewAttendanceRoster(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'MANAGER' || ctx.isAttendanceEditor;
}

export function canManageWorkplaces(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER';
}
