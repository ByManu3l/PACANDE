import type { ShipmentStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';

/**
 * The legacy updateShipmentStatus used findByIdAndUpdate without
 * runValidators, so any string could be saved as "estado" — Postgres +
 * Prisma's enum column makes an invalid value a compile-time/runtime type
 * error instead, and this also stamps shipped/delivered timestamps.
 */
export async function updateShipmentStatus(orderId: string, status: ShipmentStatus) {
  const shipment = await prisma.shipment.findUnique({ where: { orderId } });
  if (!shipment) {
    throw new NotFoundError('Este pedido todavía no tiene información de envío.');
  }

  return prisma.shipment.update({
    where: { orderId },
    data: {
      status,
      shippedAt: status === 'SHIPPED' && !shipment.shippedAt ? new Date() : undefined,
      deliveredAt: status === 'DELIVERED' && !shipment.deliveredAt ? new Date() : undefined,
    },
  });
}
