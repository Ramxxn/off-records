'use client';
import { useState, useActionState } from 'react';
import { Modal } from '@/components/shared/modal';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { addMember } from '@/lib/actions/member';

type Props = { organizationId: number; workplaceId: number };

export function AddMemberButton({ organizationId, workplaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addMember, undefined);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Add member
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add member">
        {state?.message && !state.errors && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
        )}
        {state?.message && state.errors && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="workplaceId" value={workplaceId} />
          <Field
            label="User email"
            name="email"
            type="email"
            required
            errors={state?.errors?.email}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-sm font-medium text-gray-700">Role</label>
            <select
              id="role"
              name="role"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <SubmitButton label="Add member" pendingLabel="Adding…" />
        </form>
      </Modal>
    </>
  );
}
