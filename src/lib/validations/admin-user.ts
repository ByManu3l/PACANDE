import { z } from 'zod';

/**
 * Edición de un usuario desde el panel de administración.
 *
 * Se diferencia del registro normal en dos cosas: la contraseña es
 * opcional y el rol se puede cambiar.
 *
 * Este esquema comprueba la *forma* de los datos, no los permisos. Quién
 * puede editar a quién —un ADMIN no toca a otro ADMIN, nadie se cambia el
 * rol a sí mismo— lo decide `user.service.ts`, que es donde vive esa
 * regla de negocio y donde las pruebas la verifican.
 */
export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.email('Correo inválido'),
  /**
   * Contraseña nueva, opcional. La cadena vacía se acepta y significa
   * "no cambiarla": es lo que envía un `<input>` que el administrador
   * dejó en blanco, y sin el `.or(z.literal(''))` el formulario fallaría
   * con "al menos 8 caracteres" cada vez que solo se quiere corregir un
   * nombre.
   */
  password: z.string().min(8, 'Al menos 8 caracteres').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']).optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
