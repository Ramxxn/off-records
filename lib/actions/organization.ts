'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/prisma/db';
import { verifySession } from '@/lib/auth/dal';
import { getMemberContext, canManageWorkplaces } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/utils/audit';
import { CreateOrganizationSchema, CreateWorkplaceSchema } from '@/lib/validations/app';
import type { ActionState } from '@/lib/auth/actions';

export async function createOrganization(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const parsed = CreateOrganizationSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const org = await db.orm.public.Organization.create({ name: parsed.data.name });
  await db.orm.public.Membership.create({
    userId: session.userId,
    organizationId: org.id,
    role: 'OWNER',
  });

  revalidatePath('/dashboard/organizations');
  redirect(`/dashboard/organizations/${org.id}`);
}

export async function createWorkplace(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const parsed = CreateWorkplaceSchema.safeParse({
    name: formData.get('name'),
    organizationId: formData.get('organizationId'),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { name, organizationId } = parsed.data;

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageWorkplaces(ctx)) {
    return { message: 'You do not have permission to create workplaces.' };
  }

  const existing = await db.orm.public.Workplace
    .where({ organizationId, name })
    .select('id')
    .first();
  if (existing) return { errors: { name: ['A workplace with this name already exists.'] } };

  const workplace = await db.orm.public.Workplace.create({ name, organizationId });

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'WORKPLACE_CREATED',
    entityType: 'Workplace',
    entityId: String(workplace.id),
    details: `Created workplace "${name}"`,
  });

  revalidatePath(`/dashboard/organizations/${organizationId}`);
  redirect(`/dashboard/organizations/${organizationId}/workplaces/${workplace.id}`);
}

export async function deleteWorkplace(workplaceId: number, organizationId: number) {
  const session = await verifySession();

  const ctx = await getMemberContext(session.userId, organizationId);
  if (!ctx || !canManageWorkplaces(ctx)) throw new Error('Forbidden');

  await db.orm.public.Workplace.where({ id: workplaceId, organizationId }).delete();

  await writeAuditLog({
    organizationId,
    actorUserId: session.userId,
    action: 'WORKPLACE_DELETED',
    entityType: 'Workplace',
    entityId: String(workplaceId),
  });

  revalidatePath(`/dashboard/organizations/${organizationId}`);
}
