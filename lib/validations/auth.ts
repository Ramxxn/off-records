import { z } from 'zod';

const BCRYPT_MAX_PASSWORD_BYTES = 72;

export function isBcryptPasswordLengthValid(password: string): boolean {
  return new TextEncoder().encode(password).byteLength <= BCRYPT_MAX_PASSWORD_BYTES;
}

const passwordTooLongMessage = 'Password must be 72 bytes or fewer.';

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(254).toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .refine(isBcryptPasswordLengthValid, passwordTooLongMessage),
});

export const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254).toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required')
    .refine(isBcryptPasswordLengthValid, passwordTooLongMessage),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
