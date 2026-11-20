import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/dal';
import {
  canManageAttendance,
  canViewAttendanceRoster,
  getMemberContext,
} from '@/lib/permissions';
import { db } from '@/prisma/db';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { AttendanceControls } from './attendance-controls';
import { AttendanceRecordForm } from './attendance-record-form';

type Props = {
  params: Promise<{ orgId: string; workplaceId: string }>;
  searchParams: Promise<{ before?: string | string[] }>;
};

function formatUtc(value: string) {
  return `${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))} UTC`;
}

export default async function AttendancePage({ params, searchParams }: Props) {
  const [{ orgId, workplaceId }, query] = await Promise.all([params, searchParams]);
  const organizationId = Number(orgId);
  const workplaceIdNumber = Number(workplaceId);
  if (!Number.isSafeInteger(organizationId) || organizationId < 1) notFound();
  if (!Number.isSafeInteger(workplaceIdNumber) || workplaceIdNumber < 1) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  const [workplace, ctx] = await Promise.all([
    db.orm.public.Workplace
      .where({ id: workplaceIdNumber, organizationId })
      .select('id', 'name')
      .first(),
    getMemberContext(user.id, organizationId, workplaceIdNumber),
  ]);
  if (!workplace || !ctx) notFound();

  const canViewRoster = canViewAttendanceRoster(ctx);
  const canManage = canManageAttendance(ctx);
  const membershipsInWorkplace = canViewRoster
    ? await db.orm.public.WorkplaceMembership
        .where({ workplaceId: workplaceIdNumber, organizationId })
        .select('id', 'membershipId')
        .all()
    : ctx.workplaceMembershipId
      ? await db.orm.public.WorkplaceMembership
          .where({
            id: ctx.workplaceMembershipId,
            workplaceId: workplaceIdNumber,
            organizationId,
          })
          .select('id', 'membershipId')
          .all()
      : [];
  const workplaceMembershipIds = membershipsInWorkplace.map((membership) => membership.id);
  const workplaceMembershipMap = new Map(
    membershipsInWorkplace.map((membership) => [membership.id, membership]),
  );
  const membershipIds = membershipsInWorkplace.map((membership) => membership.membershipId);
  const cursorValue = Array.isArray(query.before) ? query.before[0] : query.before;
  const cursor = cursorValue && /^\d+$/.test(cursorValue) ? Number(cursorValue) : undefined;
  const validCursor = cursor && Number.isSafeInteger(cursor) && cursor > 0 ? cursor : undefined;

  const [memberships, activeRecords, fetchedRecords] = await Promise.all([
    membershipIds.length > 0
      ? db.orm.public.Membership
          .where((membership) => membership.id.in(membershipIds))
          .where({ organizationId })
          .select('id', 'userId', 'role')
          .all()
      : [],
    workplaceMembershipIds.length > 0
      ? db.orm.public.Attendance
          .where((attendance) =>
            attendance.workplaceMembershipId.in(workplaceMembershipIds),
          )
          .where({ checkOutAt: null })
          .select('id', 'workplaceMembershipId', 'checkInAt')
          .all()
      : [],
    workplaceMembershipIds.length > 0
      ? (() => {
          const records = db.orm.public.Attendance
            .where((attendance) =>
              attendance.workplaceMembershipId.in(workplaceMembershipIds),
            );
          const page = validCursor
            ? records.where((attendance) => attendance.id.lt(validCursor))
            : records;
          return page.orderBy((attendance) => attendance.id.desc()).limit(101).all();
        })()
      : [],
  ]);

  const userIds = memberships.map((membership) => membership.userId);
  const users = userIds.length > 0
    ? await db.orm.public.User
        .where((member) => member.id.in(userIds))
        .select('id', 'name', 'email')
        .all()
    : [];
  const membershipMap = new Map(memberships.map((membership) => [membership.id, membership]));
  const userMap = new Map(users.map((member) => [member.id, member]));
  const userNameByWorkplaceMembership = new Map(
    membershipsInWorkplace.map((workplaceMembership) => {
      const membership = membershipMap.get(workplaceMembership.membershipId);
      const member = membership ? userMap.get(membership.userId) : null;
      return [
        workplaceMembership.id,
        member?.name ?? member?.email ?? 'Workplace member',
      ];
    }),
  );
  const activeMembershipIds = new Set(
    activeRecords.map((record) => record.workplaceMembershipId),
  );
  const records = fetchedRecords.slice(0, 100);
  const hasOlderRecords = fetchedRecords.length > records.length;
  const lastRecord = records[records.length - 1];
  const membersForManualEntry = canManage
    ? membershipsInWorkplace.map((workplaceMembership) => ({
        id: workplaceMembership.id,
        label: userNameByWorkplaceMembership.get(workplaceMembership.id) ?? 'Workplace member',
      }))
    : [];

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <PageHeader
        title="Attendance"
        description={workplace.name}
        action={
          <Link
            href={`/dashboard/organizations/${organizationId}/workplaces/${workplaceIdNumber}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to workplace
          </Link>
        }
      />

      {ctx.workplaceMembershipId !== null && (
        <AttendanceControls
          organizationId={organizationId}
          workplaceId={workplaceIdNumber}
          isCheckedIn={activeMembershipIds.has(ctx.workplaceMembershipId)}
        />
      )}

      {canManage && membersForManualEntry.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Add attendance record</h2>
          <AttendanceRecordForm
            organizationId={organizationId}
            workplaceId={workplaceIdNumber}
            attendanceId={null}
            members={membersForManualEntry}
          />
        </section>
      )}

      {canViewRoster && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Workplace roster</h2>
          {membershipsInWorkplace.length === 0 ? (
            <EmptyState
              title="No workplace members yet"
              description="Add employees to this workplace before recording attendance."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {membershipsInWorkplace.map((workplaceMembership) => {
                const membership = membershipMap.get(workplaceMembership.membershipId);
                return (
                  <li
                    key={workplaceMembership.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {userNameByWorkplaceMembership.get(workplaceMembership.id)}
                      </p>
                      <p className="text-xs text-gray-500">{membership?.role ?? 'Employee'}</p>
                    </div>
                    <Badge
                      variant={
                        activeMembershipIds.has(workplaceMembership.id) ? 'success' : 'default'
                      }
                    >
                      {activeMembershipIds.has(workplaceMembership.id) ? 'Checked in' : 'Not checked in'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Recent attendance</h2>
            <p className="mt-1 text-xs text-gray-500">Showing the latest 100 records. Times are UTC.</p>
          </div>
          <div className="flex gap-3 text-sm">
            {validCursor && (
              <Link
                href={`/dashboard/organizations/${organizationId}/workplaces/${workplaceIdNumber}/attendance`}
                className="font-medium text-blue-700 hover:underline"
              >
                Back to latest
              </Link>
            )}
            {hasOlderRecords && lastRecord && (
              <Link
                href={`/dashboard/organizations/${organizationId}/workplaces/${workplaceIdNumber}/attendance?before=${lastRecord.id}`}
                className="font-medium text-blue-700 hover:underline"
              >
                Load older
              </Link>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            title="No attendance records yet"
            description="Check in to create your first attendance record."
          />
        ) : (
          <ul className="space-y-3">
            {records.map((record) => {
              const recordMembership = workplaceMembershipMap.get(record.workplaceMembershipId);
              const member = recordMembership
                ? membershipMap.get(recordMembership.membershipId)
                : null;
              const userName = userNameByWorkplaceMembership.get(record.workplaceMembershipId);

              return (
                <li
                  key={record.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {userName ?? 'Workplace member'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        In: {formatUtc(record.checkInAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Out: {record.checkOutAt ? formatUtc(record.checkOutAt) : 'Still checked in'}
                      </p>
                      {record.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">
                          {record.notes}
                        </p>
                      )}
                    </div>
                    {canManage && recordMembership && member && (
                      <AttendanceRecordForm
                        organizationId={organizationId}
                        workplaceId={workplaceIdNumber}
                        workplaceMembershipId={record.workplaceMembershipId}
                        attendanceId={record.id}
                        checkInAt={record.checkInAt}
                        checkOutAt={record.checkOutAt}
                        notes={record.notes}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
