import { z } from 'zod';

/** Nota mínima y máxima. La escala de cinco estrellas es la convención. */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

export const reviewSchema = z.object({
  productId: z.string().min(1),
  /**
   * Entero de 1 a 5.
   *
   * El rango se comprueba aquí y no con una restricción en la base de
   * datos porque Postgres no tiene un tipo entero acotado: exigiría un
   * CHECK escrito a mano en la migración para algo que esta capa ya cubre
   * en los dos lados —navegador y servidor— con el mismo esquema.
   */
  rating: z
    .number()
    .int('La calificación debe ser un número entero.')
    .min(MIN_RATING, 'Elige al menos una estrella.')
    .max(MAX_RATING, `La calificación máxima es ${MAX_RATING}.`),
  title: z.string().trim().max(100, 'El título no puede superar 100 caracteres.').optional(),
  /**
   * Mínimo de 10 caracteres: por debajo de eso una opinión no informa a
   * nadie («ok», «bien»), y esas son justamente las que ensucian la ficha
   * sin aportar. El máximo evita que un solo comentario ocupe la página
   * entera.
   */
  body: z
    .string()
    .trim()
    .min(10, 'Cuéntanos un poco más: al menos 10 caracteres.')
    .max(2000, 'La opinión no puede superar 2000 caracteres.'),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/** Decisión de moderación tomada desde el panel. */
export const moderateReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  /** Nota interna: por qué se rechazó. No la ve el cliente. */
  moderationNote: z.string().trim().max(500).optional(),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
