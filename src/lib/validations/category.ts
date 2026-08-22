import { z } from 'zod';

/**
 * Alta y edición de categorías.
 *
 * El formulario del panel rellena `slug` automáticamente a partir del
 * nombre (con `slugify`), pero deja editarlo: una vez publicada, cambiar
 * el slug rompe los enlaces existentes a esa categoría, así que conviene
 * poder fijarlo aunque el nombre cambie.
 */
export const categorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  // El mismo alfabeto que produce `slugify`. Se valida además de
  // generarse porque el campo es editable a mano.
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().trim().optional(),
  /** Categoría madre. Ausente o vacío = categoría raíz. */
  parentId: z.string().optional(),
  /** Orden en el menú: menor primero, empates resueltos por nombre. */
  position: z.number().int(),
  isActive: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
