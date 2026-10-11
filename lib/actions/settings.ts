'use server';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { UpdateProfileSchema, ChangePasswordSchema } from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

export async function updateProfile(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const parsed = UpdateProfileSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db.orm.public.User.where({ id: session.userId }).update({ name: parsed.data.name });

  revalidatePath('/dashboard/settings');
  return { message: 'Profile updated.' };
}

export async function changePassword(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const user = await db.orm.public.User
    .where({ id: session.userId })
    .select('passwordHash')
    .first();

  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { errors: { currentPassword: ['Current password is incorrect.'] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.orm.public.User.where({ id: session.userId }).update({ passwordHash });

  return { message: 'Password changed successfully.' };
}
