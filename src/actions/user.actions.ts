'use server';

import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@/lib/auth/guards';
import { storage } from '@/lib/services/storage.service';
import * as userService from '@/lib/services/user.service';
import { runAction } from '@/lib/utils/action-result';
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  changePasswordSchema,
  updateProfileSchema,
} from '@/lib/validations/user';

export async function updateProfileAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const parsed = updateProfileSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos.');
    }

    await userService.updateProfile(user.id, parsed.data);
    revalidatePath('/cuenta');
  });
}

export async function changePasswordAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos.');
    }

    await userService.changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  });
}

export async function uploadAvatarAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const file = formData.get('avatar');
    if (!(file instanceof File) || file.size === 0) {
      throw new Error('Selecciona una imagen.');
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      throw new Error('Formato de imagen no soportado.');
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new Error('La imagen no puede superar 5MB.');
    }

    const filename = `${user.id}-${randomUUID()}${extname(file.name) || '.jpg'}`;
    const publicPath = await storage.save(file, 'uploads/avatars', filename);
    await userService.updateAvatar(user.id, publicPath);

    revalidatePath('/cuenta');
    return { image: publicPath };
  });
}
