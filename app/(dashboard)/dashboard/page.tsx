import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const memberships = user
    ? await db.orm.public.Membership
        .where({ userId: user.id })
        .select('id', 'organizationId', 'role')
        .all()
    : [];

  const orgIds = memberships.map((m) => m.organizationId);
  const managerOrgIds = memberships
    .filter((membership) => membership.role !== 'EMPLOYEE')
    .map((membership) => membership.organizationId);
  const employeeMembershipIds = memberships
    .filter((membership) => membership.role === 'EMPLOYEE')
    .map((membership) => membership.id);

  const [workplaces, assignedWorkplaces] = await Promise.all([
    managerOrgIds.length > 0
      ? db.orm.public.Workplace
          .where((workplace) => workplace.organizationId.in(managerOrgIds))
          .select('id')
          .all()
      : [],
    employeeMembershipIds.length > 0
      ? db.orm.public.WorkplaceMembership
          .where((membership) => membership.membershipId.in(employeeMembershipIds))
          .select('workplaceId')
          .all()
      : [],
  ]);
  const orgCount = orgIds.length;
  const workplaceCount = new Set([
    ...workplaces.map((workplace) => workplace.id),
    ...assignedWorkplaces.map((membership) => membership.workplaceId),
  ]).size;

  const stats = [
    { label: 'Organizations', value: orgCount, href: '/dashboard/organizations' },
    { label: 'Workplaces', value: workplaceCount, href: '/dashboard/organizations' },
    { label: 'My Role', value: memberships[0]?.role ?? '—', href: '/dashboard/organizations' },
  ];

  return (
    <div className="p-6 sm:p-8">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name}` : ''}`}
        description="Here's an overview of your attendance platform."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          </Link>
        ))}
      </div>

      {memberships.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">You&apos;re not part of any organization yet.</p>
          <p className="mt-1 text-sm text-gray-500">Create one to get started.</p>
          <Link
            href="/dashboard/organizations"
            className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Get started
          </Link>
        </div>
      )}
    </div>
  );
}
