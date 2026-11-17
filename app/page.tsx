import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default function RootPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50" role="status">
          <p className="text-sm text-gray-500">Loading…</p>
        </main>
      }
    >
      <RedirectAuthenticatedUser />
    </Suspense>
  );
}

async function RedirectAuthenticatedUser(): Promise<React.ReactNode> {
  const session = await getSession();
  return redirect(session?.userId ? '/dashboard' : '/login');
}
