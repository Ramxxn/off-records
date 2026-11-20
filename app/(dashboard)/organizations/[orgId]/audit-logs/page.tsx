import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/dal';
import { canViewAuditLogs, getMemberContext } from '@/lib/permissions';
import { db } from '@/prisma/db';

type Props = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ action?: string | string[] }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrganizationAuditLogsPage({ params, searchParams }: Props) {
  const [{ orgId }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const organizationId = Number(orgId);
  if (!Number.isSafeInteger(organizationId) || organizationId < 1 || !user) notFound();

  const ctx = await getMemberContext(user.id, organizationId);
  if (!ctx || !canViewAuditLogs(ctx)) notFound();

  const actionFilter = first(query.action)?.trim().slice(0, 80) ?? '';
  const logsQuery = db.orm.public.AuditLog.where({ organizationId });
  const filteredLogs = actionFilter ? logsQuery.where({ action: actionFilter }) : logsQuery;
  const logs = await filteredLogs
    .orderBy((log) => log.id.desc())
    .limit(100)
    .select('id', 'actorUserId', 'action', 'entityType', 'entityId', 'details', 'createdAt')
    .all();
  const actorIds = [...new Set(logs.flatMap((log) => log.actorUserId === null ? [] : [log.actorUserId]))];
  const actors = actorIds.length > 0
    ? await db.orm.public.User
        .where((actor) => actor.id.in(actorIds))
        .select('id', 'name', 'email')
        .all()
    : [];
  const actorById = new Map(actors.map((actor) => [actor.id, actor.name ?? actor.email]));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <PageHeader
        title="Audit log"
        description="Recent organization activity. Showing up to 100 events."
        action={
          <Link
            href={`/dashboard/organizations/${organizationId}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to organization
          </Link>
        }
      />

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-action" className="text-xs font-medium text-gray-600">
            Filter by action
          </label>
          <input
            id="audit-action"
            name="action"
            defaultValue={actionFilter}
            maxLength={80}
            placeholder="e.g. MEMBER_ADDED"
            className="rounded-md border border-gray-300 px-2.5 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Apply filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No matching activity found.</p>
        ) : (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">When (UTC)</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Actor</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Entity</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {new Date(log.createdAt).toLocaleString()} UTC
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.actorUserId === null ? 'System' : actorById.get(log.actorUserId) ?? 'Former user'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}
                  </td>
                  <td className="max-w-sm whitespace-pre-wrap break-words px-4 py-3 text-xs text-gray-500">
                    {log.details ?? '—'}
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
