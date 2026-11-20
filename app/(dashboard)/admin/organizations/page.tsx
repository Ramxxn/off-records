import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';

export default async function PlatformOrganizationsPage() {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) notFound();

  const organizations = await db.orm.public.Organization
    .orderBy((organization) => organization.id.desc())
    .limit(100)
    .select('id', 'name', 'createdAt')
    .all();
  const ids = organizations.map((organization) => organization.id);
  const [workplaces, memberships] = ids.length > 0
    ? await Promise.all([
        db.orm.public.Workplace
          .where((workplace) => workplace.organizationId.in(ids))
          .select('id', 'organizationId')
          .all(),
        db.orm.public.Membership
          .where((membership) => membership.organizationId.in(ids))
          .select('organizationId')
          .all(),
      ])
    : [[], []];
  const workplaceCounts = new Map<number, number>();
  const memberCounts = new Map<number, number>();
  for (const workplace of workplaces) {
    workplaceCounts.set(workplace.organizationId, (workplaceCounts.get(workplace.organizationId) ?? 0) + 1);
  }
  for (const membership of memberships) {
    memberCounts.set(membership.organizationId, (memberCounts.get(membership.organizationId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <PageHeader title="Organizations" description="Platform-wide organization directory. Latest 100." />
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {organizations.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No organizations found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Organization</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Workplaces</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Members</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{organization.name}</td>
                  <td className="px-4 py-3 text-gray-600">{workplaceCounts.get(organization.id) ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{memberCounts.get(organization.id) ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(organization.createdAt).toLocaleDateString()}
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
