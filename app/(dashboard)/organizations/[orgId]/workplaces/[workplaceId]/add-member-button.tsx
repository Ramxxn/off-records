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
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Add member
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add member">
        {state?.message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
        )}
        {state?.errors?.form?.[0] && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {state.errors.form[0]}
          </p>
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
          <p className="text-xs text-gray-500">
            Adds an existing account to this workplace. New organization members start as employees;
            owners can change organization roles from the organization page.
          </p>
          <SubmitButton label="Add member" pendingLabel="Adding…" />
        </form>
      </Modal>
    </>
  );
}
