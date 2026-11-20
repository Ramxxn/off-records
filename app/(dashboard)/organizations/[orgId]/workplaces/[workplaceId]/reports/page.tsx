import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/dal';
import { getAttendanceReport } from '@/lib/reports/attendance';
import { AttendanceReportRangeSchema } from '@/lib/validations/app';

type Props = {
  params: Promise<{ orgId: string; workplaceId: string }>;
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function defaultRange() {
  const today = new Date().toISOString().slice(0, 10);
  return { from: `${today.slice(0, 8)}01`, to: today };
}

function hoursBetween(checkInAt: string, checkOutAt: string | null) {
  return checkOutAt
    ? (new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / 3_600_000
    : null;
}

export default async function AttendanceReportPage({ params, searchParams }: Props) {
  const [{ orgId, workplaceId }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const organizationId = Number(orgId);
  const workplaceIdNumber = Number(workplaceId);
  if (
    !Number.isSafeInteger(organizationId) || organizationId < 1
    || !Number.isSafeInteger(workplaceIdNumber) || workplaceIdNumber < 1
  ) notFound();
  if (!user) notFound();

  const defaults = defaultRange();
  const candidate = {
    from: first(query.from) ?? defaults.from,
    to: first(query.to) ?? defaults.to,
  };
  const range = AttendanceReportRangeSchema.safeParse(candidate);
  if (!range.success) notFound();

  const report = await getAttendanceReport(
    user.id,
    organizationId,
    workplaceIdNumber,
    range.data.from,
    range.data.to,
  );
  if (!report) notFound();

  const completedHours = report.records.reduce(
    (total, record) => total + (hoursBetween(record.checkInAt, record.checkOutAt) ?? 0),
    0,
  );
  const checkedInCount = report.records.filter((record) => record.checkOutAt === null).length;
  const byEmployee = new Map<string, { name: string; records: number; hours: number }>();
  for (const record of report.records) {
    const employee = byEmployee.get(record.employeeName) ?? {
      name: record.employeeName,
      records: 0,
      hours: 0,
    };
    employee.records += 1;
    employee.hours += hoursBetween(record.checkInAt, record.checkOutAt) ?? 0;
    byEmployee.set(record.employeeName, employee);
  }
  const exportHref = `/api/organizations/${organizationId}/workplaces/${workplaceIdNumber}/attendance.csv?from=${range.data.from}&to=${range.data.to}`;

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <PageHeader
        title="Attendance report"
        description={report.workplace.name}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={exportHref}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Export CSV
            </Link>
            <Link
              href={`/dashboard/organizations/${organizationId}/workplaces/${workplaceIdNumber}`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        }
      />

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="report-from" className="text-xs font-medium text-gray-600">From</label>
          <input
            id="report-from"
            type="date"
            name="from"
            required
            defaultValue={range.data.from}
            className="rounded-md border border-gray-300 px-2.5 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="report-to" className="text-xs font-medium text-gray-600">To</label>
          <input
            id="report-to"
            type="date"
            name="to"
            required
            defaultValue={range.data.to}
            className="rounded-md border border-gray-300 px-2.5 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Apply range
        </button>
        <p className="text-xs text-gray-500">Up to 366 days. Times are UTC.</p>
      </form>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Attendance records', value: report.records.length },
          { label: 'Currently checked in', value: checkedInCount },
          { label: 'Completed hours', value: completedHours.toFixed(2) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Employee summary</h2>
        </div>
        {byEmployee.size === 0 ? (
          <EmptyState title="No attendance in this date range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Employee</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Records</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Completed hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...byEmployee.values()].map((employee) => (
                  <tr key={employee.name}>
                    <td className="px-4 py-3 font-medium text-gray-800">{employee.name}</td>
                    <td className="px-4 py-3 text-gray-600">{employee.records}</td>
                    <td className="px-4 py-3 text-gray-600">{employee.hours.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Records</h2>
        </div>
        {report.records.length === 0 ? (
          <EmptyState title="No records to display" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Employee</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Check-in (UTC)</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Check-out (UTC)</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{record.employeeName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {new Date(record.checkInAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {record.checkOutAt ? new Date(record.checkOutAt).toLocaleString() : 'In progress'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {hoursBetween(record.checkInAt, record.checkOutAt)?.toFixed(2) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
