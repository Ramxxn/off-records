'use client';
import { useState, useActionState } from 'react';
import { Modal } from '@/components/shared/modal';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { createOrganization } from '@/lib/actions/organization';

export function CreateOrgButton() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createOrganization, undefined);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        New organization
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Create organization">
        {state?.message && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}
        <form action={action} className="flex flex-col gap-4">
          <Field label="Organization name" name="name" required errors={state?.errors?.name} />
          <SubmitButton label="Create" pendingLabel="Creating…" />
        </form>
      </Modal>
    </>
  );
}
