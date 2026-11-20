import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/dal';
import { db } from '@/prisma/db';

export default async function PlatformAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) notFound();

  const logs = await db.orm.public.AuditLog
    .orderBy((log) => log.id.desc())
    .limit(100)
    .select('id', 'organizationId', 'actorUserId', 'action', 'entityType', 'entityId', 'details', 'createdAt')
    .all();
  const organizationIds = [...new Set(logs.map((log) => log.organizationId))];
  const actorIds = [...new Set(logs.flatMap((log) => log.actorUserId === null ? [] : [log.actorUserId]))];
  const [organizations, actors] = await Promise.all([
    organizationIds.length > 0
      ? db.orm.public.Organization
          .where((organization) => organization.id.in(organizationIds))
          .select('id', 'name')
          .all()
      : [],
    actorIds.length > 0
      ? db.orm.public.User
          .where((actor) => actor.id.in(actorIds))
          .select('id', 'name', 'email')
          .all()
      : [],
  ]);
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization.name]));
  const actorById = new Map(actors.map((actor) => [actor.id, actor.name ?? actor.email]));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <PageHeader title="Platform audit log" description="Recent activity across organizations. Latest 100." />
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No activity found.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">When (UTC)</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Organization</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Actor</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Entity / details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {new Date(log.createdAt).toLocaleString()} UTC
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {organizationById.get(log.organizationId) ?? 'Organization'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.actorUserId === null ? 'System' : actorById.get(log.actorUserId) ?? 'Former user'}
                  </td>
                  <td className="max-w-md whitespace-pre-wrap break-words px-4 py-3 text-xs text-gray-500">
                    {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}
                    {log.details ? ` · ${log.details}` : ''}
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
