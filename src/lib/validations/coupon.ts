import { z } from 'zod';

/**
 * Alta y edición de cupones desde el panel.
 *
 * Las reglas cruzadas —que un porcentaje no pase de 100, que la fecha de
 * fin no sea anterior a la de inicio— se comprueban con `superRefine` y no
 * campo a campo, porque dependen de más de un valor a la vez.
 */
export const couponSchema = z
  .object({
    /**
     * Solo letras, números y guiones. Un código con espacios o acentos es
     * imposible de dictar por teléfono y se copia mal desde un correo.
     * El servicio lo normaliza a mayúsculas.
     */
    code: z
      .string()
      .trim()
      .min(3, 'El código debe tener al menos 3 caracteres.')
      .max(30, 'El código no puede superar 30 caracteres.')
      .regex(/^[A-Za-z0-9-]+$/, 'Solo letras, números y guiones.'),

    /** Para qué campaña es. Uso interno; el cliente no lo ve. */
    description: z.string().trim().max(200).optional(),

    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().positive('El valor debe ser mayor que 0.'),

    minPurchase: z.number().nonnegative().nullable().optional(),
    maxDiscount: z.number().positive().nullable().optional(),
    maxUses: z.number().int().positive().nullable().optional(),

    startsAt: z.date().nullable().optional(),
    endsAt: z.date().nullable().optional(),

    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Un descuento porcentual no puede superar 100.',
      });
    }

    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'La fecha de fin no puede ser anterior a la de inicio.',
      });
    }

    // Un tope de descuento sobre un cupón de importe fijo no significa
    // nada: el importe ya es el tope. Se avisa en vez de ignorarlo en
    // silencio, para que quien lo configura no crea que hizo algo.
    if (data.type === 'FIXED' && data.maxDiscount != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxDiscount'],
        message: 'El tope solo aplica a descuentos porcentuales.',
      });
    }
  });

export type CouponFormInput = z.infer<typeof couponSchema>;

/** Código que escribe el cliente en el carrito. */
export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, 'Escribe un código.').max(30),
});
