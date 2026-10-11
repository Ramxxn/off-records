'use server';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/prisma/db';
import { createSession, deleteSession } from '@/lib/auth/session';
import { RegisterSchema, LoginSchema } from '@/lib/validations/auth';

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

export async function register(state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.orm.public.User.where({ email }).select('id').first();
  if (existing) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.orm.public.User.create({ email, name, passwordHash });

  await createSession(user.id);
  redirect('/dashboard');
}

export async function login(state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  const user = await db.orm.public.User
    .where({ email })
    .select('id', 'passwordHash')
    .first();

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { errors: { email: ['Invalid email or password.'] } };
  }

  await createSession(user.id);
  redirect('/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
