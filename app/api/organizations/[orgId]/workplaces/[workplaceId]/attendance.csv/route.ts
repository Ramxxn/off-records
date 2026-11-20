import { getCurrentUser } from '@/lib/auth/dal';
import { getAttendanceReport } from '@/lib/reports/attendance';
import { attendanceCsv } from '@/lib/reports/csv';
import { AttendanceReportRangeSchema } from '@/lib/validations/app';

type Props = {
  params: Promise<{ orgId: string; workplaceId: string }>;
  request: Request;
};

export async function GET(request: Request, { params }: Omit<Props, 'request'>) {
  const [{ orgId, workplaceId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const organizationId = Number(orgId);
  const workplaceIdNumber = Number(workplaceId);
  if (
    !Number.isSafeInteger(organizationId) || organizationId < 1
    || !Number.isSafeInteger(workplaceIdNumber) || workplaceIdNumber < 1
  ) {
    return new Response('Invalid workplace.', { status: 400 });
  }

  const query = new URL(request.url).searchParams;
  const range = AttendanceReportRangeSchema.safeParse({
    from: query.get('from'),
    to: query.get('to'),
  });
  if (!range.success) return new Response('Invalid report date range.', { status: 400 });

  const report = await getAttendanceReport(
    user.id,
    organizationId,
    workplaceIdNumber,
    range.data.from,
    range.data.to,
  );
  if (!report) return new Response('Not found.', { status: 404 });

  return new Response(attendanceCsv(report.records), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="attendance.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
