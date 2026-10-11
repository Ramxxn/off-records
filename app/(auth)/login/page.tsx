'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/lib/auth/actions';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Sign in</h2>

      {state?.message && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
          errors={state?.errors?.password}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton label="Sign in" pendingLabel="Signing in…" />
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
