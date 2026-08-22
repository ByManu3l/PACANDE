import { describe, expect, it } from 'vitest';

import {
  addItem,
  cartTotals,
  getOrCreateCart,
  mergeGuestCartIntoUser,
  removeItem,
  updateItemQuantity,
} from '@/lib/services/cart.service';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

async function setup() {
  const user = await createUser();
  const category = await createCategory();
  const product = await createProduct(category.id, { price: 25000 });
  return { user, category, product };
}

describe('cart.service', () => {
  it('creates a cart lazily and adds an item to it', async () => {
    const { user, product } = await setup();

    const cart = await addItem({ userId: user.id }, product.id, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
  });

  it('increments quantity when the same product is added twice', async () => {
    const { user, product } = await setup();

    await addItem({ userId: user.id }, product.id, 1);
    const cart = await addItem({ userId: user.id }, product.id, 3);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(4);
  });

  it('rejects adding a quantity below 1', async () => {
    const { user, product } = await setup();
    await expect(addItem({ userId: user.id }, product.id, 0)).rejects.toThrow(ValidationError);
  });

  it('rejects adding an inactive product', async () => {
    const { user, category } = await setup();
    const inactive = await createProduct(category.id, { slug: 'inactive' });
    await prisma.product.update({ where: { id: inactive.id }, data: { isActive: false } });

    await expect(addItem({ userId: user.id }, inactive.id, 1)).rejects.toThrow(ValidationError);
  });

  it('removes an item entirely when its quantity is updated to 0', async () => {
    const { user, product } = await setup();
    await addItem({ userId: user.id }, product.id, 2);

    const cart = await updateItemQuantity({ userId: user.id }, product.id, 0);
    expect(cart.items).toHaveLength(0);
  });

  it('removeItem deletes only the targeted product', async () => {
    const { user, category, product } = await setup();
    const other = await createProduct(category.id, { slug: 'other-product' });
    await addItem({ userId: user.id }, product.id, 1);
    await addItem({ userId: user.id }, other.id, 1);

    const cart = await removeItem({ userId: user.id }, product.id);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].productId).toBe(other.id);
  });

  it('cartTotals sums quantity and price correctly', async () => {
    const { user, category } = await setup();
    const a = await createProduct(category.id, { slug: 'a', price: 10000 });
    const b = await createProduct(category.id, { slug: 'b', price: 5000 });
    await addItem({ userId: user.id }, a.id, 2); // 20000
    await addItem({ userId: user.id }, b.id, 3); // 15000
    const cart = await getOrCreateCart({ userId: user.id });

    const { itemCount, subtotal } = cartTotals(cart);
    expect(itemCount).toBe(5);
    expect(subtotal).toBe(35000);
  });

  describe('mergeGuestCartIntoUser', () => {
    it('moves guest items into the user cart and deletes the guest cart', async () => {
      const { user, product } = await setup();
      const guestToken = 'guest-token-1';
      await addItem({ guestToken }, product.id, 2);

      await mergeGuestCartIntoUser(guestToken, user.id);

      const userCart = await getOrCreateCart({ userId: user.id });
      expect(userCart.items).toHaveLength(1);
      expect(userCart.items[0].quantity).toBe(2);
      expect(await prisma.cart.findUnique({ where: { guestToken } })).toBeNull();
    });

    it('adds quantities together when the user already has the same product', async () => {
      const { user, product } = await setup();
      const guestToken = 'guest-token-2';
      await addItem({ userId: user.id }, product.id, 1);
      await addItem({ guestToken }, product.id, 3);

      await mergeGuestCartIntoUser(guestToken, user.id);

      const userCart = await getOrCreateCart({ userId: user.id });
      expect(userCart.items).toHaveLength(1);
      expect(userCart.items[0].quantity).toBe(4);
    });

    it('is a no-op when the guest cart does not exist', async () => {
      const { user } = await setup();
      await expect(mergeGuestCartIntoUser('nonexistent-token', user.id)).resolves.not.toThrow();
    });
  });
});
