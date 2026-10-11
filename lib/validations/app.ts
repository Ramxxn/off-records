import { z } from 'zod';
import { isBcryptPasswordLengthValid } from '@/lib/validations/auth';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
});

export const CreateWorkplaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  organizationId: z.coerce.number().int().positive(),
});

export const AddMemberSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  role: z.enum(['MANAGER', 'EMPLOYEE']),
  organizationId: z.coerce.number().int().positive(),
  workplaceId: z.coerce.number().int().positive(),
});

export const UpsertAttendanceSchema = z.object({
  workplaceMembershipId: z.coerce.number().int().positive(),
  checkInAt: z.string().datetime({ offset: true }),
  checkOutAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .refine(isBcryptPasswordLengthValid, 'Password must be 72 bytes or fewer.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Must contain a letter')
    .regex(/[0-9]/, 'Must contain a number')
    .refine(isBcryptPasswordLengthValid, 'Password must be 72 bytes or fewer.'),
});
