import { NextRequest, NextResponse } from 'next/server';
import { decrypt, SESSION_COOKIE_NAME } from '@/lib/auth/session-token';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await decrypt(token) : null;
  const isAuthenticated = session !== null;

  const isPublic = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));

  if (!isAuthenticated && !isPublic) {
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff2?|ttf|otf)$).*)',
  ],
};
