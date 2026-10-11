'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/auth/actions';

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Organizations', href: '/dashboard/organizations' },
  { label: 'Settings', href: '/dashboard/settings' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Organizations', href: '/admin/organizations' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Audit Logs', href: '/admin/audit-logs' },
];

type SidebarProps = {
  userName: string | null;
  userEmail: string;
  isPlatformAdmin: boolean;
};

export function Sidebar({ userName, userEmail, isPlatformAdmin }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <span className="text-base font-semibold tracking-tight text-gray-900">Off-Records</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center rounded-md px-3 py-2 text-sm transition ${
                  isActive(href)
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}

          {isPlatformAdmin && (
            <>
              <li className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
                Platform Admin
              </li>
              {ADMIN_NAV.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center rounded-md px-3 py-2 text-sm transition ${
                      isActive(href)
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-gray-900">{userName ?? userEmail}</p>
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
