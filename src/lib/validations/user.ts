import { z } from 'zod';

/** Datos editables del propio perfil, en `/cuenta`. */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.email('Correo inválido'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Cambio de contraseña.
 *
 * Pide la contraseña actual aunque la sesión ya esté iniciada: evita que
 * quien encuentre una sesión abierta pueda apropiarse de la cuenta, y es
 * lo que espera cualquier usuario de una pantalla como esta.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  // `path` hace que el mensaje aparezca bajo el campo de confirmación y
  // no suelto al principio del formulario.
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Límites del avatar. Ver la nota equivalente en `validations/product.ts`. */
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
