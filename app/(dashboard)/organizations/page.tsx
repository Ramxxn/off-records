import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/shared/badge';
import { CreateOrgButton } from './create-org-button';

export default async function OrganizationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await db.orm.public.Membership
    .where({ userId: user.id })
    .select('id', 'role', 'organizationId')
    .all();

  const orgIds = memberships.map((m) => m.organizationId);

  const organizations = orgIds.length > 0
    ? await db.orm.public.Organization
        .where({ id: { in: orgIds } })
        .select('id', 'name', 'createdAt')
        .all()
    : [];

  const roleMap = Object.fromEntries(memberships.map((m) => [m.organizationId, m.role]));

  return (
    <div className="p-6 sm:p-8">
      <PageHeader
        title="Organizations"
        description="Manage your organizations and workplaces."
        action={<CreateOrgButton />}
      />

      <div className="mt-6">
        {organizations.length === 0 ? (
          <EmptyState
            title="No organizations yet"
            description="Create your first organization to get started."
            action={<CreateOrgButton />}
          />
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
            {organizations.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/dashboard/organizations/${org.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={roleMap[org.id] === 'OWNER' ? 'info' : 'default'}>
                    {roleMap[org.id]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
