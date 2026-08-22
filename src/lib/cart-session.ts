import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';
import * as cartService from '@/lib/services/cart.service';

const GUEST_CART_COOKIE = 'cart_token';
const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

/**
 * Puente entre el contexto de la petición (sesión + cookies) y la
 * identidad de carrito que entiende `cart.service`.
 *
 * Vive fuera de `actions/` a propósito: todo lo exportado desde un archivo
 * `'use server'` es un endpoint invocable desde el navegador. Estas
 * funciones reciben o derivan un `userId`, así que exponerlas como Server
 * Actions permitiría a cualquiera pasar el id de otra persona. Aquí son
 * funciones normales de servidor, importables tanto por Server Components
 * (el Navbar) como por Server Actions.
 */

/**
 * Determina de quién es el carrito sobre el que se opera.
 *
 * @param createGuestIfMissing Crea la cookie de invitado si aún no existe.
 *   Solo debe ser `true` en escrituras: un `GET` que crea cookies rompe el
 *   cacheo y genera carritos vacíos para bots que nunca compran.
 */
export async function resolveCartIdentity(createGuestIfMissing: boolean) {
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

/** Carrito actual, o `null` si el visitante todavía no tiene ninguno. */
export async function getCurrentCart() {
  const identity = await resolveCartIdentity(false);
  if (!identity.userId && !identity.guestToken) return null;
  return cartService.getCart(identity);
}

/**
 * Vuelca el carrito de invitado en el del usuario recién autenticado.
 *
 * Se llama desde `auth.actions` justo después de `signIn()`, pasando el id
 * que devolvió la verificación de credenciales — `auth()` todavía no ve la
 * cookie de sesión dentro de esa misma invocación.
 */
export async function mergeGuestCartIntoSession(userId: string) {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestToken) return;

  await cartService.mergeGuestCartIntoUser(guestToken, userId);
  cookieStore.delete(GUEST_CART_COOKIE);
}
