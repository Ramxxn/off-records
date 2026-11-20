'use client';
import { useActionState } from 'react';
import { updateOrganizationMemberRole } from '@/lib/actions/member';
import { SubmitButton } from '@/components/ui/submit-button';

type Props = {
  membershipId: number;
  organizationId: number;
  memberName: string;
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
};

export function MemberRoleForm({ membershipId, organizationId, memberName, role }: Props) {
  const [state, action] = useActionState(
    updateOrganizationMemberRole.bind(null, membershipId, organizationId),
    undefined,
  );
  const roleLabelId = `member-role-${membershipId}`;

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <label htmlFor={roleLabelId} className="sr-only">
        Organization role for {memberName}
      </label>
      <select
        id={roleLabelId}
        name="role"
        defaultValue={role}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
      >
        <option value="EMPLOYEE">Employee</option>
        <option value="MANAGER">Manager</option>
        <option value="OWNER">Owner</option>
      </select>
      <SubmitButton label="Save role" pendingLabel="Saving…" />
      {state?.errors?.role?.[0] && (
        <span className="w-full text-right text-xs text-red-600" role="alert">
          {state.errors.role[0]}
        </span>
      )}
      {state?.message && (
        <span className="w-full text-right text-xs text-gray-600" role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}
