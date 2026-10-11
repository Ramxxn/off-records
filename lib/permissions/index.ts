import 'server-only';
import { db } from '@/prisma/db';

export type MemberContext = {
  membershipId: number;
  organizationId: number;
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
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

  let isAttendanceEditor = false;
  if (workplaceId) {
    const wm = await db.orm.public.WorkplaceMembership
      .where({ membershipId: membership.id, workplaceId })
      .select('id')
      .first();
    if (wm) {
      const perm = await db.orm.public.AttendancePermission
        .where({ workplaceMembershipId: wm.id })
        .select('id')
        .first();
      isAttendanceEditor = !!perm;
    }
  }

  return {
    membershipId: membership.id,
    organizationId,
    role: membership.role as MemberContext['role'],
    isAttendanceEditor,
  };
}

export function canManageAttendance(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'MANAGER' || ctx.isAttendanceEditor;
}

export function canManageMembers(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER';
}

export function canManageWorkplaces(ctx: MemberContext): boolean {
  return ctx.role === 'OWNER';
}
