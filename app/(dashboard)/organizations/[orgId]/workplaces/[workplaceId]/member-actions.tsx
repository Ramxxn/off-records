'use client';
import { useState, useTransition } from 'react';
import {
  grantAttendanceEditor,
  removeMember,
  revokeAttendanceEditor,
} from '@/lib/actions/member';

type Props = {
  workplaceMembershipId: number;
  organizationId: number;
  hasEditorPerm: boolean;
};

export function MemberActions({
  workplaceMembershipId,
  organizationId,
  hasEditorPerm,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  function run(action: typeof removeMember) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await action(workplaceMembershipId, organizationId);
      setMessage(result?.message);
    });
  }

  function toggleAttendanceEditor() {
    run(hasEditorPerm ? revokeAttendanceEditor : grantAttendanceEditor);
  }

  function confirmRemoval() {
    if (window.confirm('Remove this member from the workplace?')) {
      run(removeMember);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={toggleAttendanceEditor}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {hasEditorPerm ? 'Revoke editor' : 'Grant editor'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirmRemoval}
          className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Remove
        </button>
      </div>
      {message && (
        <p className="text-right text-xs text-gray-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
