import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/dal';
import { Sidebar } from '@/components/layout/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        userName={user.name}
        userEmail={user.email}
        isPlatformAdmin={user.isPlatformAdmin}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
