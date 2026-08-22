'use server';

import { revalidatePath } from 'next/cache';

import type { ReviewStatus } from '@/generated/prisma/client';
import { requireRole, requireSession } from '@/lib/auth/guards';
import * as reviewService from '@/lib/services/review.service';
import { runAction } from '@/lib/utils/action-result';
import { moderateReviewSchema, reviewSchema } from '@/lib/validations/review';

/**
 * Opiniones de clientes.
 *
 * Nota sobre quién puede qué: publicar exige sesión, y el servicio
 * comprueba además que esa persona haya comprado el producto. Moderar y
 * borrar exigen rol de administración.
 */

/**
 * Publica una opinión. Queda pendiente de moderación.
 *
 * El `userId` sale de la sesión, nunca de los datos enviados: aceptarlo
 * como parámetro permitiría publicar opiniones en nombre de otra persona.
 */
export async function createReviewAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSession();
    const datos = reviewSchema.parse(input);

    await reviewService.createReview({ userId: user.id, ...datos });

    revalidatePath('/producto', 'layout');
    return { pending: true as const };
  });
}

/** Cola de moderación del panel. */
export async function listReviewsAction(status?: ReviewStatus) {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  return reviewService.listReviewsForAdmin(status);
}

export async function moderateReviewAction(reviewId: string, input: unknown) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    const { status, moderationNote } = moderateReviewSchema.parse(input);

    await reviewService.moderateReview(reviewId, status, moderationNote);

    revalidatePath('/admin/resenas');
    // La ficha del producto muestra la opinión y la valoración media, que
    // acaba de recalcularse.
    revalidatePath('/producto', 'layout');
  });
}

export async function deleteReviewAction(reviewId: string) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await reviewService.deleteReview(reviewId);

    revalidatePath('/admin/resenas');
    revalidatePath('/producto', 'layout');
  });
}
