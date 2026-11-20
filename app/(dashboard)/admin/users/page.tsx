import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';

export default async function PlatformUsersPage() {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) notFound();

  const users = await db.orm.public.User
    .orderBy((record) => record.id.desc())
    .limit(100)
    .select('id', 'name', 'email', 'isPlatformAdmin', 'createdAt')
    .all();
  const userIds = users.map((record) => record.id);
  const memberships = userIds.length > 0
    ? await db.orm.public.Membership
        .where((membership) => membership.userId.in(userIds))
        .select('userId', 'organizationId', 'role')
        .all()
    : [];
  const organizationIds = [...new Set(memberships.map((membership) => membership.organizationId))];
  const organizations = organizationIds.length > 0
    ? await db.orm.public.Organization
        .where((organization) => organization.id.in(organizationIds))
        .select('id', 'name')
        .all()
    : [];
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization.name]));
  const membershipsByUserId = new Map<number, typeof memberships>();
  for (const membership of memberships) {
    const userMemberships = membershipsByUserId.get(membership.userId) ?? [];
    userMemberships.push(membership);
    membershipsByUserId.set(membership.userId, userMemberships);
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <PageHeader title="Users" description="Platform-wide account directory. Latest 100." />
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {users.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No users found.</p>
        ) : (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">User</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Organizations</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Access</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((record) => (
                <tr key={record.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{record.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{record.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(membershipsByUserId.get(record.id) ?? []).map((membership) => (
                      <p key={membership.organizationId}>
                        {organizationById.get(membership.organizationId) ?? 'Organization'} · {membership.role}
                      </p>
                    ))}
                    {(membershipsByUserId.get(record.id) ?? []).length === 0 && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.isPlatformAdmin ? 'Platform admin' : 'Standard user'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
