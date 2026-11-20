import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AddMemberSchema,
  AttendanceReportRangeSchema,
  AttendanceSelfActionSchema,
  AttendanceDeleteSchema,
  OrganizationMemberRoleSchema,
  UpsertAttendanceSchema,
  WorkplaceMemberActionSchema,
} from '@/lib/validations/app';
import {
  canViewAuditLogs,
  canManageAttendance,
  canManageMembers,
  canViewAttendanceRoster,
  canViewOrganizationMembers,
  type MemberContext,
} from '@/lib/permissions';
import { attendanceCsv, csvCell } from '@/lib/reports/csv';

function memberContext(
  role: MemberContext['role'],
  isAttendanceEditor = false,
): MemberContext {
  return {
    membershipId: 1,
    organizationId: 1,
    role,
    workplaceMembershipId: 1,
    isAttendanceEditor,
  };
}

test('member actions require positive safe integer identifiers', () => {
  assert.equal(
    WorkplaceMemberActionSchema.safeParse({
      workplaceMembershipId: 1,
      organizationId: Number.MAX_SAFE_INTEGER,
    }).success,
    true,
  );
  assert.equal(
    WorkplaceMemberActionSchema.safeParse({
      workplaceMembershipId: 0,
      organizationId: 1,
    }).success,
    false,
  );
  assert.equal(
    AttendanceDeleteSchema.safeParse({
      attendanceId: Number.MAX_SAFE_INTEGER + 1,
      organizationId: 1,
      workplaceId: 1,
    }).success,
    false,
  );
});

test('organization role changes accept only a valid member, tenant, and role', () => {
  assert.equal(
    OrganizationMemberRoleSchema.safeParse({
      membershipId: 1,
      organizationId: 2,
      role: 'MANAGER',
    }).success,
    true,
  );
  assert.equal(
    OrganizationMemberRoleSchema.safeParse({
      membershipId: 1,
      organizationId: 2,
      role: 'PLATFORM_ADMIN',
    }).success,
    false,
  );
  assert.equal(
    OrganizationMemberRoleSchema.safeParse({
      membershipId: 0,
      organizationId: 2,
      role: 'EMPLOYEE',
    }).success,
    false,
  );
});

test('workplace assignment normalizes email and requires safe tenant identifiers', () => {
  const parsed = AddMemberSchema.safeParse({
    email: '  WORKER@EXAMPLE.COM ',
    organizationId: '4',
    workplaceId: '9',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.email, 'worker@example.com');

  assert.equal(
    AddMemberSchema.safeParse({
      email: 'worker@example.com',
      organizationId: '9007199254740992',
      workplaceId: '9',
    }).success,
    false,
  );
});

test('attendance checkout must be later than check-in', () => {
  const record = {
    workplaceMembershipId: '4',
    checkInAt: '2026-11-17T09:00:00+05:30',
    checkOutAt: '2026-11-17T17:00:00+05:30',
  };
  assert.equal(UpsertAttendanceSchema.safeParse(record).success, true);
  assert.equal(
    UpsertAttendanceSchema.safeParse({
      ...record,
      checkOutAt: '2026-11-17T08:59:00+05:30',
    }).success,
    false,
  );
});

test('attendance actions accept form identifiers and reject unsafe selections', () => {
  assert.equal(
    AttendanceSelfActionSchema.safeParse({
      organizationId: '4',
      workplaceId: '9',
    }).success,
    true,
  );
  assert.equal(
    AttendanceSelfActionSchema.safeParse({
      organizationId: '4',
      workplaceId: '-1',
    }).success,
    false,
  );
  assert.equal(
    AttendanceSelfActionSchema.safeParse({
      organizationId: '9007199254740992',
      workplaceId: '9',
    }).success,
    false,
  );
});

test('attendance report ranges validate calendar dates and cap ranges at 366 days', () => {
  assert.equal(
    AttendanceReportRangeSchema.safeParse({ from: '2026-02-01', to: '2026-02-28' }).success,
    true,
  );
  assert.equal(
    AttendanceReportRangeSchema.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success,
    false,
  );
  assert.equal(
    AttendanceReportRangeSchema.safeParse({ from: '2025-01-01', to: '2026-01-02' }).success,
    false,
  );
});

test('attendance CSV escapes cells and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
  assert.equal(csvCell('Name, "quoted"'), '"Name, ""quoted"""');
  assert.match(
    attendanceCsv([{
      employeeName: '=HYPERLINK("https://example.test")',
      checkInAt: '2026-11-20T09:00:00.000Z',
      checkOutAt: '2026-11-20T17:00:00.000Z',
      notes: null,
    }]),
    /"'=HYPERLINK\(""https:\/\/example\.test""\)"/,
  );
});

test('manual attendance rejects malformed datetimes and oversized notes', () => {
  const record = {
    workplaceMembershipId: '4',
    checkInAt: '2026-11-17T09:00:00.000Z',
  };
  assert.equal(UpsertAttendanceSchema.safeParse(record).success, true);
  assert.equal(
    UpsertAttendanceSchema.safeParse({ ...record, checkInAt: 'tomorrow morning' }).success,
    false,
  );
  assert.equal(
    UpsertAttendanceSchema.safeParse({ ...record, notes: 'x'.repeat(501) }).success,
    false,
  );
});

test('employee access stays self-scoped unless Attendance Editor is granted', () => {
  const employee = memberContext('EMPLOYEE');
  assert.equal(canManageAttendance(employee), false);
  assert.equal(canViewAttendanceRoster(employee), false);
  assert.equal(canViewOrganizationMembers(employee), false);
  assert.equal(canViewAuditLogs(employee), false);
  assert.equal(canManageMembers(employee), false);

  const editor = memberContext('EMPLOYEE', true);
  assert.equal(canManageAttendance(editor), true);
  assert.equal(canViewAttendanceRoster(editor), true);
  assert.equal(canViewOrganizationMembers(editor), false);
  assert.equal(canManageMembers(editor), false);
});

test('managers see rosters but only owners can manage organization members', () => {
  const manager = memberContext('MANAGER');
  assert.equal(canManageAttendance(manager), true);
  assert.equal(canViewAttendanceRoster(manager), true);
  assert.equal(canViewOrganizationMembers(manager), true);
  assert.equal(canViewAuditLogs(manager), true);
  assert.equal(canManageMembers(manager), false);

  const owner = memberContext('OWNER');
  assert.equal(canViewOrganizationMembers(owner), true);
  assert.equal(canViewAuditLogs(owner), true);
  assert.equal(canManageMembers(owner), true);
});
