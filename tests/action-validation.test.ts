import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AttendanceDeleteSchema,
  UpsertAttendanceSchema,
  WorkplaceMemberActionSchema,
} from '@/lib/validations/app';

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
