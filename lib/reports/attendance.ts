import 'server-only';
import { getMemberContext, canViewAttendanceRoster } from '@/lib/permissions';
import { db } from '@/prisma/db';
import { AttendanceReportRangeSchema } from '@/lib/validations/app';

export async function getAttendanceReport(
  userId: number,
  organizationId: number,
  workplaceId: number,
  from: string,
  to: string,
) {
  const range = AttendanceReportRangeSchema.safeParse({ from, to });
  if (!range.success) return null;

  const [workplace, ctx] = await Promise.all([
    db.orm.public.Workplace
      .where({ id: workplaceId, organizationId })
      .select('id', 'name')
      .first(),
    getMemberContext(userId, organizationId, workplaceId),
  ]);
  if (!workplace || !ctx) return null;

  const workplaceMemberships = canViewAttendanceRoster(ctx)
    ? await db.orm.public.WorkplaceMembership
        .where({ workplaceId, organizationId })
        .select('id', 'membershipId')
        .all()
    : ctx.workplaceMembershipId
      ? await db.orm.public.WorkplaceMembership
          .where({
            id: ctx.workplaceMembershipId,
            workplaceId,
            organizationId,
          })
          .select('id', 'membershipId')
          .all()
      : [];
  const workplaceMembershipIds = workplaceMemberships.map((membership) => membership.id);
  if (workplaceMembershipIds.length === 0) {
    return { workplace, records: [] };
  }

  const membershipIds = workplaceMemberships.map((membership) => membership.membershipId);
  const memberships = await db.orm.public.Membership
    .where((membership) => membership.id.in(membershipIds))
    .where({ organizationId })
    .select('id', 'userId')
    .all();
  const users = memberships.length > 0
    ? await db.orm.public.User
        .where((user) => user.id.in(memberships.map((membership) => membership.userId)))
        .select('id', 'name', 'email')
        .all()
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const userByMembershipId = new Map(
    memberships.map((membership) => {
      return [membership.id, userById.get(membership.userId)];
    }),
  );
  const membershipByWorkplaceMembershipId = new Map(
    workplaceMemberships.map((membership) => [membership.id, membership.membershipId]),
  );
  const endExclusive = new Date(
    new Date(`${range.data.to}T00:00:00.000Z`).getTime() + 86_400_000,
  ).toISOString();
  const records = await db.orm.public.Attendance
    .where((attendance) => attendance.workplaceMembershipId.in(workplaceMembershipIds))
    .where((attendance) => attendance.checkInAt.gte(`${range.data.from}T00:00:00.000Z`))
    .where((attendance) => attendance.checkInAt.lt(endExclusive))
    .orderBy((attendance) => attendance.checkInAt.desc())
    .select('id', 'workplaceMembershipId', 'checkInAt', 'checkOutAt', 'notes')
    .all();

  return {
    workplace,
    records: records.map((record) => {
      const membershipId = membershipByWorkplaceMembershipId.get(record.workplaceMembershipId);
      const user = membershipId === undefined ? undefined : userByMembershipId.get(membershipId);
      return {
        ...record,
        employeeName: user?.name ?? user?.email ?? 'Workplace member',
      };
    }),
  };
}
