import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/utils/errors';

interface CartIdentity {
  userId?: string;
  guestToken?: string;
}

const CART_INCLUDE = {
  items: {
    include: { product: true },
    orderBy: { id: 'asc' as const },
  },
};

async function findCart(identity: CartIdentity) {
  if (identity.userId) {
    return prisma.cart.findUnique({ where: { userId: identity.userId }, include: CART_INCLUDE });
  }
  if (identity.guestToken) {
    return prisma.cart.findUnique({
      where: { guestToken: identity.guestToken },
      include: CART_INCLUDE,
    });
  }
  return null;
}

/** Returns the existing cart for this identity, creating one if needed.
 * A logged-in user always resolves by userId; an anonymous visitor is
 * tracked by an opaque guestToken stored in a cookie by the caller. */
export async function getOrCreateCart(identity: CartIdentity) {
  const existing = await findCart(identity);
  if (existing) return existing;

  const cart = await prisma.cart.create({
    data: {
      userId: identity.userId,
      guestToken: identity.userId ? undefined : identity.guestToken,
    },
  });
  return prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: CART_INCLUDE });
}

export async function getCart(identity: CartIdentity) {
  return findCart(identity);
}

export function newGuestToken() {
  return randomUUID();
}

export async function addItem(identity: CartIdentity, productId: string, quantity: number) {
  if (quantity < 1) {
    throw new ValidationError('La cantidad debe ser al menos 1.');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    throw new ValidationError('El producto ya no está disponible.');
  }

  const cart = await getOrCreateCart(identity);
  const existingItem = cart.items.find((item) => item.productId === productId);

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  }

  return getOrCreateCart(identity);
}

export async function updateItemQuantity(
  identity: CartIdentity,
  productId: string,
  quantity: number,
) {
  const cart = await getOrCreateCart(identity);

  if (quantity < 1) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  } else {
    await prisma.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { quantity } });
  }

  return getOrCreateCart(identity);
}

export async function removeItem(identity: CartIdentity, productId: string) {
  const cart = await getOrCreateCart(identity);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return getOrCreateCart(identity);
}

export async function clearCart(identity: CartIdentity) {
  const cart = await getOrCreateCart(identity);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

/** Called right after a successful login/registration: folds whatever was
 * in the anonymous guest cart into the user's persistent cart, so items
 * added before authenticating aren't lost. */
export async function mergeGuestCartIntoUser(guestToken: string, userId: string) {
  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await prisma.cart.delete({ where: { id: guestCart.id } });
    return;
  }

  const userCart = await getOrCreateCart({ userId });

  for (const guestItem of guestCart.items) {
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: userCart.id, productId: guestItem.productId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + guestItem.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: userCart.id, productId: guestItem.productId, quantity: guestItem.quantity },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
}

export function cartTotals(cart: { items: { quantity: number; product: { price: unknown } }[] }) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  return { itemCount, subtotal };
}
