import { describe, expect, it } from 'vitest';

import { updateShipmentStatus } from '@/lib/services/shipment.service';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

async function createOrderWithShipment() {
  const user = await createUser();
  const category = await createCategory();
  await createProduct(category.id);

  const order = await prisma.order.create({
    data: {
      orderNumber: `TEST-${Math.random().toString(36).slice(2, 8)}`,
      userId: user.id,
      paymentMethod: 'contra_entrega',
      subtotal: 10000,
      shippingCost: 0,
      total: 10000,
      shippingRecipientName: 'x',
      shippingLine1: 'x',
      shippingCity: 'x',
      shippingRegion: 'x',
      shippingPostalCode: 'x',
      shippingCountry: 'CO',
      shippingPhone: 'x',
      shipment: { create: { status: 'PENDING' } },
    },
    include: { shipment: true },
  });
  return order;
}

describe('shipment.service.updateShipmentStatus', () => {
  it('throws for an order with no shipment', async () => {
    const user = await createUser();
    const order = await prisma.order.create({
      data: {
        orderNumber: 'TEST-NOSHIP',
        userId: user.id,
        paymentMethod: 'contra_entrega',
        subtotal: 1000,
        shippingCost: 0,
        total: 1000,
        shippingRecipientName: 'x',
        shippingLine1: 'x',
        shippingCity: 'x',
        shippingRegion: 'x',
        shippingPostalCode: 'x',
        shippingCountry: 'CO',
        shippingPhone: 'x',
      },
    });

    await expect(updateShipmentStatus(order.id, 'SHIPPED')).rejects.toThrow(NotFoundError);
  });

  it('updates the status and stamps shippedAt on first transition to SHIPPED', async () => {
    const order = await createOrderWithShipment();

    const updated = await updateShipmentStatus(order.id, 'SHIPPED');
    expect(updated.status).toBe('SHIPPED');
    expect(updated.shippedAt).not.toBeNull();
    expect(updated.deliveredAt).toBeNull();
  });

  it('does not overwrite shippedAt on a later status change', async () => {
    const order = await createOrderWithShipment();

    const first = await updateShipmentStatus(order.id, 'SHIPPED');
    const firstShippedAt = first.shippedAt;

    const second = await updateShipmentStatus(order.id, 'DELIVERED');
    expect(second.shippedAt?.getTime()).toBe(firstShippedAt?.getTime());
    expect(second.deliveredAt).not.toBeNull();
  });
});
