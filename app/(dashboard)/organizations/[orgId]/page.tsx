import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';
import {
  getMemberContext,
  canManageWorkplaces,
  canManageMembers,
  canViewOrganizationMembers,
} from '@/lib/permissions';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/shared/badge';
import { CreateWorkplaceButton } from './create-workplace-button';
import { MemberRoleForm } from './member-role-form';

type Props = { params: Promise<{ orgId: string }> };

export default async function OrganizationPage({ params }: Props) {
  const { orgId } = await params;
  const id = Number(orgId);
  if (isNaN(id)) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  const [org, ctx] = await Promise.all([
    db.orm.public.Organization.where({ id }).select('id', 'name', 'createdAt').first(),
    getMemberContext(user.id, id),
  ]);

  if (!org || !ctx) notFound();

  const canViewMembers = canViewOrganizationMembers(ctx);
  const [workplaces, memberships] = await Promise.all([
    ctx.role === 'EMPLOYEE'
      ? db.orm.public.WorkplaceMembership
          .where({ membershipId: ctx.membershipId, organizationId: id })
          .select('workplaceId')
          .all()
          .then(async (workplaceMemberships) => {
            const workplaceIds = workplaceMemberships.map((membership) => membership.workplaceId);
            return workplaceIds.length > 0
              ? db.orm.public.Workplace
                  .where((workplace) => workplace.id.in(workplaceIds))
                  .where({ organizationId: id })
                  .select('id', 'name', 'createdAt')
                  .all()
              : [];
          })
      : db.orm.public.Workplace
          .where({ organizationId: id })
          .select('id', 'name', 'createdAt')
          .all(),
    canViewMembers
      ? db.orm.public.Membership
          .where({ organizationId: id })
          .select('id', 'role', 'userId')
          .all()
      : [],
  ]);

  const userIds = memberships.map((m) => m.userId);
  const users = userIds.length > 0
    ? await db.orm.public.User
        .where((user) => user.id.in(userIds))
        .select('id', 'name', 'email')
        .all()
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const isOwner = canManageWorkplaces(ctx);
  const canEditMemberRoles = canManageMembers(ctx);

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <PageHeader
        title={org.name}
        description={`Created ${new Date(org.createdAt).toLocaleDateString()}`}
        action={isOwner ? <CreateWorkplaceButton organizationId={id} /> : undefined}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Workplaces</h2>
        {workplaces.length === 0 ? (
          <EmptyState
            title="No workplaces yet"
            description="Create a workplace to start managing attendance."
            action={isOwner ? <CreateWorkplaceButton organizationId={id} /> : undefined}
          />
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
            {workplaces.map((wp) => (
              <li key={wp.id}>
                <Link
                  href={`/dashboard/organizations/${id}/workplaces/${wp.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-900">{wp.name}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(wp.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canViewMembers && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Members</h2>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
            {memberships.map((m) => {
              const u = userMap[m.userId];
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u?.name ?? u?.email ?? '—'}</p>
                    <p className="text-xs text-gray-500">{u?.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={m.role === 'OWNER' ? 'info' : m.role === 'MANAGER' ? 'warning' : 'default'}>
                      {m.role}
                    </Badge>
                    {canEditMemberRoles && (
                      <MemberRoleForm
                        membershipId={m.id}
                        organizationId={id}
                        memberName={u?.name ?? u?.email ?? 'member'}
                        role={m.role}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
