'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@/lib/auth/guards';
import * as wishlistService from '@/lib/services/wishlist.service';
import { runAction } from '@/lib/utils/action-result';

/**
 * Favoritos.
 *
 * Solo hay una acción porque en la interfaz solo hay un botón que
 * alterna. Separarla en añadir y quitar obligaría al cliente a conocer el
 * estado actual antes de decidir cuál llamar, y ese estado puede haber
 * cambiado en otra pestaña.
 *
 * El `userId` sale siempre de la sesión.
 */
export async function toggleWishlistAction(productId: string) {
  return runAction(async () => {
    const user = await requireSession();
    const enFavoritos = await wishlistService.toggleWishlist(user.id, productId);

    revalidatePath('/cuenta/favoritos');
    return { wishlisted: enFavoritos };
  });
}
