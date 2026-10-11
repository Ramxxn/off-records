import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Reset password</h2>
      <p className="mb-6 text-sm text-gray-500">
        Password reset is not yet available. Contact your administrator.
      </p>
      <Link
        href="/login"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Back to sign in
      </Link>
    </div>
  );
}
