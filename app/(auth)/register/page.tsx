'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { register } from '@/lib/auth/actions';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function RegisterPage() {
  const [state, action] = useActionState(register, undefined);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Create account</h2>

      {state?.message && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          required
          errors={state?.errors?.name}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          errors={state?.errors?.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          errors={state?.errors?.password}
        />
        <SubmitButton label="Create account" pendingLabel="Creating account…" />
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
