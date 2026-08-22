'use server';

import { revalidatePath } from 'next/cache';

import { resolveCartIdentity } from '@/lib/cart-session';
import * as cartService from '@/lib/services/cart.service';
import { runAction } from '@/lib/utils/action-result';

/**
 * Mutaciones del carrito.
 *
 * Todas devuelven solo un resumen plano (`{ itemCount, subtotal }`), nunca
 * el carrito de Prisma: el valor de retorno de una Server Action cruza el
 * límite RSC hacia un Client Component, y `Decimal` (el tipo de
 * `product.price`) no es serializable ahí. Quien necesite el carrito
 * completo lo re-obtiene con `router.refresh()`.
 *
 * La lectura del carrito no vive aquí sino en `lib/cart-session.ts`
 * (`getCurrentCart`), porque los Server Components la necesitan sin pasar
 * por la capa de acciones.
 */

export async function addToCartAction(productId: string, quantity = 1) {
  return runAction(async () => {
    const identity = await resolveCartIdentity(true);
    const cart = await cartService.addItem(identity, productId, quantity);
    revalidatePath('/carrito');
    return cartService.cartTotals(cart);
  });
}

export async function updateCartItemAction(productId: string, quantity: number) {
  return runAction(async () => {
    const identity = await resolveCartIdentity(true);
    const cart = await cartService.updateItemQuantity(identity, productId, quantity);
    revalidatePath('/carrito');
    return cartService.cartTotals(cart);
  });
}

export async function removeFromCartAction(productId: string) {
  return runAction(async () => {
    const identity = await resolveCartIdentity(true);
    const cart = await cartService.removeItem(identity, productId);
    revalidatePath('/carrito');
    return cartService.cartTotals(cart);
  });
}
