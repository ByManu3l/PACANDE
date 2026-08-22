import { afterEach, describe, expect, it, vi } from 'vitest';

import { addItem } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import { paymentProvider } from '@/lib/services/payment.service';
import { prisma } from '@/lib/prisma';
import { UnauthorizedError, ValidationError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

const SHIPPING_ADDRESS = {
  recipientName: 'Test Buyer',
  line1: 'Calle 1 #2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
  country: 'CO',
  phone: '3000000000',
  // Se usa `tarjeta_simulada` para que las pruebas que sustituyen
  // `paymentProvider.charge()` lo ejerciten de verdad: `contra_entrega`
  // no pasa por la pasarela (hay una prueba propia más abajo), porque no
  // se cobra nada hasta la entrega.
  paymentMethod: 'tarjeta_simulada' as const,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('order.service.checkout', () => {
  it('rejects checkout for an unauthenticated caller', async () => {
    await expect(checkout(undefined, SHIPPING_ADDRESS)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects checkout with an empty cart', async () => {
    const user = await createUser();
    await expect(checkout(user.id, SHIPPING_ADDRESS)).rejects.toThrow(ValidationError);
  });

  it('computes the order total from the CURRENT database price, not any client-supplied value', async () => {
    // Esta es la prueba de la vulnerabilidad exacta que la reescritura
    // close: the legacy shipmentController trusted a "precio" field sent
    // in the request body. checkout()'s signature has no price parameter
    // at all — the only way to influence the total is Product.price in
    // the database — so this test changes that price mid-flow and checks
    // the order reflects the NEW price, proving there is no other input.
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 50000, stock: 5 });

    await addItem({ userId: user.id }, product.id, 2); // cart built at 50000/unit

    // Simulate the price changing after the item was added to the cart
    // (e.g. the admin runs a sale) — checkout must use THIS price.
    await prisma.product.update({ where: { id: product.id }, data: { price: 30000 } });

    vi.spyOn(paymentProvider, 'charge').mockResolvedValue({ approved: true, reference: 'ok' });

    const result = await checkout(user.id, SHIPPING_ADDRESS);

    expect(result.approved).toBe(true);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: result.order.id },
      include: { items: true },
    });
    expect(Number(order.items[0].unitPrice)).toBe(30000);
    expect(Number(order.subtotal)).toBe(60000); // 2 x 30000, not 2 x 50000
  });

  it('generates a human-readable, date-prefixed, sequential order number', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 10000, stock: 5 });
    await addItem({ userId: user.id }, product.id, 1);

    vi.spyOn(paymentProvider, 'charge').mockResolvedValue({ approved: true, reference: 'ok' });

    const result = await checkout(user.id, SHIPPING_ADDRESS);
    expect(result.order.orderNumber).toMatch(/^PCD-\d{8}-0001$/);
  });

  it('on approval: marks the order PAID, creates a Shipment, decrements stock, and clears the cart', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 10000, stock: 5 });
    await addItem({ userId: user.id }, product.id, 2);

    vi.spyOn(paymentProvider, 'charge').mockResolvedValue({ approved: true, reference: 'ok' });
    const result = await checkout(user.id, SHIPPING_ADDRESS);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: result.order.id },
      include: { shipment: true },
    });
    expect(order.status).toBe('PAID');
    expect(order.paymentStatus).toBe('APPROVED');
    expect(order.shipment?.status).toBe('PENDING');

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.stock).toBe(3); // 5 - 2

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(0);
  });

  it('on decline: cancels the order, releases the reserved stock, and leaves the cart intact', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 10000, stock: 5 });
    await addItem({ userId: user.id }, product.id, 2);

    vi.spyOn(paymentProvider, 'charge').mockResolvedValue({
      approved: false,
      declineReason: 'Fondos insuficientes.',
    });
    const result = await checkout(user.id, SHIPPING_ADDRESS);
    expect(result.approved).toBe(false);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: result.order.id } });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('DECLINED');

    const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshedProduct.stock).toBe(5); // released back to original

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(1); // still there, so the customer can retry
  });

  it('contra_entrega always approves without calling the payment gateway (nothing is charged until delivery)', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 10000, stock: 5 });
    await addItem({ userId: user.id }, product.id, 1);

    const chargeSpy = vi.spyOn(paymentProvider, 'charge');

    const result = await checkout(user.id, {
      ...SHIPPING_ADDRESS,
      paymentMethod: 'contra_entrega',
    });

    expect(result.approved).toBe(true);
    expect(chargeSpy).not.toHaveBeenCalled();
  });

  it('rejects checkout when requested quantity exceeds stock', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 10000, stock: 1 });
    await addItem({ userId: user.id }, product.id, 1);
    // Stock drops below what's already in the cart (e.g. another order beat it).
    await prisma.product.update({ where: { id: product.id }, data: { stock: 0 } });

    await expect(checkout(user.id, SHIPPING_ADDRESS)).rejects.toThrow(ValidationError);
  });
});
