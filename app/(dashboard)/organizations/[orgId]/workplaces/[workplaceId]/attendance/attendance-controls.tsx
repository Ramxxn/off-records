'use client';
import { useActionState } from 'react';
import {
  checkInAttendance,
  checkOutAttendance,
} from '@/lib/actions/attendance';
import { SubmitButton } from '@/components/ui/submit-button';

type Props = {
  organizationId: number;
  workplaceId: number;
  isCheckedIn: boolean;
};

export function AttendanceControls({
  organizationId,
  workplaceId,
  isCheckedIn,
}: Props) {
  const actionToRun = isCheckedIn ? checkOutAttendance : checkInAttendance;
  const [state, action] = useActionState(actionToRun, undefined);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Your attendance</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isCheckedIn ? 'You are currently checked in.' : 'You have not checked in yet.'}
            {' '}Times are recorded in UTC.
          </p>
        </div>
        <form action={action}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="workplaceId" value={workplaceId} />
          <SubmitButton
            label={isCheckedIn ? 'Check out' : 'Check in'}
            pendingLabel={isCheckedIn ? 'Checking out…' : 'Checking in…'}
          />
        </form>
      </div>
      {state?.message && (
        <p className="mt-3 text-sm text-gray-600" role="status">
          {state.message}
        </p>
      )}
    </div>
  );
}
