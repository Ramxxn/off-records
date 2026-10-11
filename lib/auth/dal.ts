import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/prisma/db';

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) redirect('/login');
  if (!(await getCurrentUser())) redirect('/login');
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  return db.orm.public.User
    .where({ id: session.userId })
    .select('id', 'email', 'name', 'isPlatformAdmin')
    .first();
});
