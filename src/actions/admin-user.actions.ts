'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/guards';
import * as userService from '@/lib/services/user.service';
import { runAction } from '@/lib/utils/action-result';
import { adminUpdateUserSchema, type AdminUpdateUserInput } from '@/lib/validations/admin-user';

export async function listUsersAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  return userService.listUsers();
}

export async function adminUpdateUserAction(targetId: string, input: AdminUpdateUserInput) {
  return runAction(async () => {
    const actor = await requireRole(['ADMIN', 'SUPERADMIN']);
    const parsed = adminUpdateUserSchema.parse(input);

    await userService.adminUpdateUser(actor.id, actor.role, targetId, {
      name: parsed.name,
      email: parsed.email,
      password: parsed.password || undefined,
      role: parsed.role,
    });

    revalidatePath('/admin/usuarios');
  });
}

export async function adminDeleteUserAction(targetId: string) {
  return runAction(async () => {
    const actor = await requireRole(['ADMIN', 'SUPERADMIN']);
    await userService.adminDeleteUser(actor.id, actor.role, targetId);
    revalidatePath('/admin/usuarios');
  });
}
