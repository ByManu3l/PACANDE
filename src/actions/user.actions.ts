'use server';

import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@/lib/auth/guards';
import { isUserUpload, storage } from '@/lib/services/storage.service';
import * as userService from '@/lib/services/user.service';
import { runAction } from '@/lib/utils/action-result';
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  changePasswordSchema,
  updateProfileSchema,
} from '@/lib/validations/user';

/**
 * Acciones sobre la propia cuenta, en `/cuenta`.
 *
 * Todas empiezan por `requireSession()` y operan **solo** sobre
 * `user.id`, tomado de la sesion. Ninguna acepta un identificador de
 * usuario como parametro: si lo hiciera, cualquiera podria enviar el id
 * de otra persona y editar su cuenta. Para administrar cuentas ajenas
 * esta `admin-user.actions.ts`, que si comprueba el rol.
 */

export async function updateProfileAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const profile = updateProfileSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
    });

    await userService.updateProfile(user.id, profile);
    revalidatePath('/cuenta');
  });
}

export async function changePasswordAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const passwords = changePasswordSchema.parse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });

    await userService.changePassword(user.id, passwords.currentPassword, passwords.newPassword);
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

    // El id va delante para poder rastrear a quien pertenece un archivo;
    // el UUID evita colisiones y que se pueda adivinar la URL del avatar
    // de otra persona a partir de su id.
    const filename = `${user.id}-${randomUUID()}${extname(file.name) || '.jpg'}`;
    const publicPath = await storage.save(file, 'uploads/avatars', filename);
    const { previousImage } = await userService.updateAvatar(user.id, publicPath);

    // El avatar anterior ya no lo referencia nadie: si no se borra aquí,
    // se queda en disco para siempre. Solo se borran subidas de usuario —
    // una imagen del catálogo semilla nunca debe eliminarse.
    if (previousImage && isUserUpload(previousImage)) {
      await storage.delete(previousImage);
    }

    revalidatePath('/cuenta');
    return { image: publicPath };
  });
}
