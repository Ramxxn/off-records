import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';
import { getMemberContext, canManageMembers } from '@/lib/permissions';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/shared/badge';
import { AddMemberButton } from './add-member-button';
import { MemberActions } from './member-actions';

type Props = { params: Promise<{ orgId: string; workplaceId: string }> };

export default async function WorkplacePage({ params }: Props) {
  const { orgId, workplaceId } = await params;
  const orgId_ = Number(orgId);
  const wpId = Number(workplaceId);
  if (isNaN(orgId_) || isNaN(wpId)) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  const [workplace, ctx] = await Promise.all([
    db.orm.public.Workplace
      .where({ id: wpId, organizationId: orgId_ })
      .select('id', 'name')
      .first(),
    getMemberContext(user.id, orgId_, wpId),
  ]);

  if (!workplace || !ctx) notFound();

  const wms = await db.orm.public.WorkplaceMembership
    .where({ workplaceId: wpId, organizationId: orgId_ })
    .select('id', 'membershipId')
    .all();

  const membershipIds = wms.map((w) => w.membershipId);

  const [memberships, permissions] = await Promise.all([
    membershipIds.length > 0
      ? db.orm.public.Membership
          .where({ id: { in: membershipIds } })
          .select('id', 'userId', 'role')
          .all()
      : [],
    wms.length > 0
      ? db.orm.public.AttendancePermission
          .where({ workplaceMembershipId: { in: wms.map((w) => w.id) } })
          .select('workplaceMembershipId')
          .all()
      : [],
  ]);

  const permSet = new Set(permissions.map((p) => p.workplaceMembershipId));
  const membershipMap = Object.fromEntries(memberships.map((m) => [m.id, m]));

  const userIds = memberships.map((m) => m.userId);
  const users = userIds.length > 0
    ? await db.orm.public.User.where({ id: { in: userIds } }).select('id', 'name', 'email').all()
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const isOwner = canManageMembers(ctx);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <PageHeader
        title={workplace.name}
        description={`Organization ID: ${orgId_}`}
        action={
          <div className="flex gap-2">
            <Link
              href={`/dashboard/organizations/${orgId_}/workplaces/${wpId}/attendance`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Attendance
            </Link>
            {isOwner && <AddMemberButton organizationId={orgId_} workplaceId={wpId} />}
          </div>
        }
      />

      {wms.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Add members to this workplace."
          action={isOwner ? <AddMemberButton organizationId={orgId_} workplaceId={wpId} /> : undefined}
        />
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
          {wms.map((wm) => {
            const membership = membershipMap[wm.membershipId];
            const u = membership ? userMap[membership.userId] : null;
            const hasEditorPerm = permSet.has(wm.id);

            return (
              <li key={wm.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u?.name ?? u?.email ?? '—'}</p>
                  <p className="text-xs text-gray-500">{u?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasEditorPerm && <Badge variant="success">Attendance Editor</Badge>}
                  <Badge
                    variant={
                      membership?.role === 'OWNER'
                        ? 'info'
                        : membership?.role === 'MANAGER'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {membership?.role ?? '—'}
                  </Badge>
                  {isOwner && (
                    <MemberActions
                      workplaceMembershipId={wm.id}
                      organizationId={orgId_}
                      hasEditorPerm={hasEditorPerm}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
