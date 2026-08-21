'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';
import * as cartService from '@/lib/services/cart.service';
import { runAction } from '@/lib/utils/action-result';

const GUEST_CART_COOKIE = 'cart_token';
const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

/** Resolves whose cart we're operating on: a logged-in user's, or an
 * anonymous visitor's guest cart tracked by a cookie (created lazily on
 * first write, never on a plain read, to avoid setting cookies on GETs). */
async function resolveIdentity(createGuestIfMissing: boolean) {
  const session = await auth();
  if (session?.user) {
    return { userId: session.user.id };
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (existingToken) {
    return { guestToken: existingToken };
  }

  if (!createGuestIfMissing) {
    return {};
  }

  const token = cartService.newGuestToken();
  cookieStore.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: GUEST_CART_MAX_AGE,
    path: '/',
  });
  return { guestToken: token };
}

export async function getCartAction() {
  const identity = await resolveIdentity(false);
  if (!identity.userId && !identity.guestToken) return null;
  return cartService.getCart(identity);
}

// These return only a plain, serializable summary — never the raw Prisma
// cart — because Server Action return values cross the RSC boundary to a
// Client Component, and Prisma's Decimal (product.price) isn't a plain
// object React can serialize there. Callers re-fetch via router.refresh().
export async function addToCartAction(productId: string, quantity = 1) {
  return runAction(async () => {
    const identity = await resolveIdentity(true);
    const cart = await cartService.addItem(identity, productId, quantity);
    revalidatePath('/carrito');
    return cartService.cartTotals(cart);
  });
}

export async function updateCartItemAction(productId: string, quantity: number) {
  return runAction(async () => {
    const identity = await resolveIdentity(true);
    const cart = await cartService.updateItemQuantity(identity, productId, quantity);
    revalidatePath('/carrito');
    return cartService.cartTotals(cart);
  });
}

export async function removeFromCartAction(productId: string) {
  return runAction(async () => {
    const identity = await resolveIdentity(true);
    const cart = await cartService.removeItem(identity, productId);
    revalidatePath('/carrito');
    return cartService.cartTotals(cart);
  });
}

/** Call after a successful signIn(): folds the anonymous guest cart (if
 * any) into the now-authenticated user's persistent cart. */
export async function mergeGuestCartAction(userId: string) {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestToken) return;

  await cartService.mergeGuestCartIntoUser(guestToken, userId);
  cookieStore.delete(GUEST_CART_COOKIE);
}
