'use client';
import { useActionState, useState, useTransition } from 'react';
import { deleteAttendance, upsertAttendance } from '@/lib/actions/attendance';
import { SubmitButton } from '@/components/ui/submit-button';

type MemberOption = {
  id: number;
  label: string;
};

type Props = {
  organizationId: number;
  workplaceId: number;
  workplaceMembershipId?: number;
  attendanceId: number | null;
  checkInAt?: string;
  checkOutAt?: string | null;
  notes?: string | null;
  members?: MemberOption[];
};

function utcInputValue(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

export function AttendanceRecordForm({
  organizationId,
  workplaceId,
  workplaceMembershipId,
  attendanceId,
  checkInAt,
  checkOutAt,
  notes,
  members,
}: Props) {
  const [state, action] = useActionState(
    upsertAttendance.bind(null, organizationId, workplaceId, attendanceId),
    undefined,
  );
  const [pending, startTransition] = useTransition();
  const [deleteMessage, setDeleteMessage] = useState<string>();
  const formId = attendanceId ?? `new-${workplaceId}`;
  const isEditing = attendanceId !== null;

  function removeRecord() {
    if (!attendanceId || !window.confirm('Delete this attendance record?')) return;
    setDeleteMessage(undefined);
    startTransition(async () => {
      const result = await deleteAttendance(attendanceId, organizationId, workplaceId);
      setDeleteMessage(result?.message ?? 'Attendance deletion failed.');
    });
  }

  return (
    <details className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-blue-700">
        {isEditing ? 'Edit record' : 'Add attendance'}
      </summary>
      <form action={action} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {workplaceMembershipId ? (
          <input type="hidden" name="workplaceMembershipId" value={workplaceMembershipId} />
        ) : (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor={`member-${formId}`} className="text-sm font-medium text-gray-700">
              Employee
            </label>
            <select
              id={`member-${formId}`}
              name="workplaceMembershipId"
              required
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>Select an employee</option>
              {members?.map((member) => (
                <option key={member.id} value={member.id}>{member.label}</option>
              ))}
            </select>
            {state?.errors?.workplaceMembershipId?.[0] && (
              <p className="text-xs text-red-600" role="alert">
                {state.errors.workplaceMembershipId[0]}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor={`check-in-${formId}`} className="text-sm font-medium text-gray-700">
            Check-in (UTC)
          </label>
          <input
            id={`check-in-${formId}`}
            name="checkInAt"
            type="datetime-local"
            required
            defaultValue={utcInputValue(checkInAt)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          {state?.errors?.checkInAt?.[0] && (
            <p className="text-xs text-red-600" role="alert">{state.errors.checkInAt[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`check-out-${formId}`} className="text-sm font-medium text-gray-700">
            Check-out (UTC)
          </label>
          <input
            id={`check-out-${formId}`}
            name="checkOutAt"
            type="datetime-local"
            defaultValue={utcInputValue(checkOutAt)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          {state?.errors?.checkOutAt?.[0] && (
            <p className="text-xs text-red-600" role="alert">{state.errors.checkOutAt[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={`notes-${formId}`} className="text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id={`notes-${formId}`}
            name="notes"
            maxLength={500}
            rows={2}
            defaultValue={notes ?? ''}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        {state?.message && (
          <p className="text-sm text-gray-700 sm:col-span-2" role="status">{state.message}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <SubmitButton
            label={isEditing ? 'Save changes' : 'Add record'}
            pendingLabel="Saving…"
          />
          {isEditing && (
            <button
              type="button"
              disabled={pending}
              onClick={removeRecord}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          )}
          {deleteMessage && (
            <span className="text-sm text-gray-600" role="status">{deleteMessage}</span>
          )}
        </div>
      </form>
    </details>
  );
}
