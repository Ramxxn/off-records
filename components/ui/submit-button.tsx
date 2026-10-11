'use client';
import { useFormStatus } from 'react-dom';

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
};

export function SubmitButton({ label, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (pendingLabel ?? label) : label}
    </button>
  );
}
