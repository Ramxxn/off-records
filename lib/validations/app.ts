import { z } from 'zod';
import { isBcryptPasswordLengthValid } from '@/lib/validations/auth';

const IdSchema = z.number().int().positive().safe();

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
});

export const CreateWorkplaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  organizationId: z.coerce.number().int().positive(),
});

export const AddMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  organizationId: z.coerce.number().int().positive().safe(),
  workplaceId: z.coerce.number().int().positive().safe(),
});

export const OrganizationMemberRoleSchema = z.object({
  membershipId: IdSchema,
  organizationId: IdSchema,
  role: z.enum(['OWNER', 'MANAGER', 'EMPLOYEE']),
});

export const UpsertAttendanceSchema = z.object({
  workplaceMembershipId: z.coerce.number().int().positive(),
  checkInAt: z.string().datetime({ offset: true }),
  checkOutAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
}).refine(
  ({ checkInAt, checkOutAt }) =>
    !checkOutAt || new Date(checkOutAt).getTime() > new Date(checkInAt).getTime(),
  {
    path: ['checkOutAt'],
    message: 'Check-out must be later than check-in.',
  },
);

export const WorkplaceMemberActionSchema = z.object({
  workplaceMembershipId: IdSchema,
  organizationId: IdSchema,
});

export const AttendanceDeleteSchema = z.object({
  attendanceId: IdSchema,
  organizationId: IdSchema,
  workplaceId: IdSchema,
});

export const AttendanceSelfActionSchema = z.object({
  organizationId: z.coerce.number().int().positive().safe(),
  workplaceId: z.coerce.number().int().positive().safe(),
});

export const AttendanceReportRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid start date.'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid end date.'),
}).refine(
  ({ from, to }) => {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    return Number.isFinite(days) && days >= 0 && days <= 365
      && start.toISOString().slice(0, 10) === from
      && end.toISOString().slice(0, 10) === to;
  },
  { path: ['to'], message: 'Choose a valid range of no more than 366 days.' },
);

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
