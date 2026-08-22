import { describe, expect, it } from 'vitest';

import {
  addItem,
  cartTotals,
  getOrCreateCart,
  mergeGuestCartIntoUser,
  newGuestToken,
  updateItemQuantity,
} from '@/lib/services/cart.service';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

describe('control de stock al llenar el carrito', () => {
  it('rechaza añadir más unidades de las disponibles', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'casi-agotado', stock: 2 });
    const identity = { guestToken: newGuestToken() };

    await expect(addItem(identity, product.id, 3)).rejects.toThrow(ValidationError);
  });

  it('cuenta lo que ya hay en el carrito, no solo lo que se añade', async () => {
    // El fallo clásico: validar solo la cantidad de esta llamada deja
    // pasar N pulsaciones de "añadir 1" sobre un producto con 1 unidad.
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'unico', stock: 1 });
    const identity = { guestToken: newGuestToken() };

    await addItem(identity, product.id, 1);
    await expect(addItem(identity, product.id, 1)).rejects.toThrow(/Solo queda/);
  });

  it('rechaza fijar una cantidad por encima del stock', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'tres-unidades', stock: 3 });
    const identity = { guestToken: newGuestToken() };

    await addItem(identity, product.id, 1);
    await expect(updateItemQuantity(identity, product.id, 99)).rejects.toThrow(ValidationError);
  });

  it('una cantidad menor que 1 elimina la línea en vez de fallar', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'para-quitar', stock: 5 });
    const identity = { guestToken: newGuestToken() };

    await addItem(identity, product.id, 2);
    const cart = await updateItemQuantity(identity, product.id, 0);

    expect(cart.items).toHaveLength(0);
  });

  it('rechaza cantidades no enteras', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'entero', stock: 5 });

    await expect(addItem({ guestToken: newGuestToken() }, product.id, 1.5)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('fusión del carrito de invitado al iniciar sesión', () => {
  it('suma cantidades cuando el producto está en ambos carritos', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'en-ambos', stock: 50 });
    const user = await createUser();
    const guestToken = newGuestToken();

    await addItem({ userId: user.id }, product.id, 2);
    await addItem({ guestToken }, product.id, 3);

    await mergeGuestCartIntoUser(guestToken, user.id);

    const cart = await getOrCreateCart({ userId: user.id });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
  });

  it('traslada los productos que solo tenía el invitado', async () => {
    const category = await createCategory();
    const soloInvitado = await createProduct(category.id, { slug: 'solo-invitado', stock: 10 });
    const user = await createUser();
    const guestToken = newGuestToken();

    await addItem({ guestToken }, soloInvitado.id, 4);
    await mergeGuestCartIntoUser(guestToken, user.id);

    const cart = await getOrCreateCart({ userId: user.id });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].productId).toBe(soloInvitado.id);
  });

  it('elimina el carrito de invitado para que no se vuelva a fusionar', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { slug: 'una-sola-vez', stock: 10 });
    const user = await createUser();
    const guestToken = newGuestToken();

    await addItem({ guestToken }, product.id, 2);
    await mergeGuestCartIntoUser(guestToken, user.id);

    expect(await prisma.cart.findUnique({ where: { guestToken } })).toBeNull();

    // Repetir la fusión no debe duplicar cantidades: es lo que pasaría si
    // el carrito de invitado sobreviviera y el usuario volviera a entrar.
    await mergeGuestCartIntoUser(guestToken, user.id);
    const cart = await getOrCreateCart({ userId: user.id });
    expect(cart.items[0].quantity).toBe(2);
  });

  it('no falla cuando el invitado no tenía carrito', async () => {
    const user = await createUser();
    await expect(mergeGuestCartIntoUser(newGuestToken(), user.id)).resolves.not.toThrow();
  });
});

describe('cartTotals', () => {
  it('suma unidades y subtotal de todas las líneas', async () => {
    const category = await createCategory();
    const a = await createProduct(category.id, { slug: 'total-a', stock: 10, price: 1000 });
    const b = await createProduct(category.id, { slug: 'total-b', stock: 10, price: 2500 });
    const identity = { guestToken: newGuestToken() };

    await addItem(identity, a.id, 2);
    await addItem(identity, b.id, 1);

    const totals = cartTotals(await getOrCreateCart(identity));
    expect(totals.itemCount).toBe(3);
    expect(totals.subtotal).toBe(4500);
  });
});
