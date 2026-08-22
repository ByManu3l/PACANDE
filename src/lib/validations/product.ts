import { z } from 'zod';

/** Alta y edición de productos desde el panel. */
export const productSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres'),
  /**
   * Precio como `number`. Viaja así entre el formulario y la Server
   * Action, y `product.service.ts` lo convierte a `Decimal` justo antes
   * de guardarlo. Un precio de hasta 2^53 céntimos entra sin pérdida en
   * un `number`; el riesgo del punto flotante aparece al *acumular*
   * importes, y esa suma solo ocurre en la base de datos con `Decimal`.
   */
  price: z.number().positive('El precio debe ser mayor a 0'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  /** Debe ser una categoría *hoja*: el formulario solo ofrece esas. */
  categoryId: z.string().min(1, 'Selecciona una categoría'),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

/**
 * Límites de las imágenes de producto.
 *
 * Se comprueban en el navegador (para avisar antes de subir 40 MB) y otra
 * vez en `product.actions.ts`, que es la comprobación que cuenta.
 *
 * Están separados de los de avatar (`validations/user.ts`) aunque hoy
 * coincidan: son decisiones independientes y es razonable que una tienda
 * quiera fotos de catálogo grandes y avatares pequeños.
 */
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
