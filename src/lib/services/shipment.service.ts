import type { ShipmentStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';

/**
 * Avance del estado logístico de un pedido.
 *
 * `status` es del tipo `ShipmentStatus`, así que un valor inventado no
 * compila y, si llegara en tiempo de ejecución, la columna enum de
 * Postgres lo rechazaría. Esa doble garantía es intencional: en la
 * versión original de este proyecto el estado era texto libre y cualquier
 * cadena acababa guardada, dejando pedidos en estados que ninguna
 * pantalla sabía interpretar.
 *
 * Las fechas se estampan solas en la **primera** transición a `SHIPPED` y
 * a `DELIVERED`. El `!shipment.shippedAt` es lo que las hace inmutables:
 * si el pedido vuelve a pasar por ese estado —una corrección manual, por
 * ejemplo— la fecha original se conserva, porque es un dato histórico y
 * no un reflejo del estado actual.
 *
 * Nota: no se restringe qué transiciones son válidas (de `DELIVERED` se
 * puede volver a `PENDING`). Es deliberado — el administrador necesita
 * poder corregir un error de clic sin pelearse con la aplicación. Si tu
 * operación necesita un flujo estricto, este es el punto donde añadir la
 * tabla de transiciones permitidas.
 *
 * @throws {NotFoundError} si el pedido aún no tiene envío asociado, lo
 *   que ocurre mientras el pago no se ha aprobado.
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
      // `undefined` significa "no toques esta columna"; `null` la
      // borraría. La diferencia importa aquí.
      shippedAt: status === 'SHIPPED' && !shipment.shippedAt ? new Date() : undefined,
      deliveredAt: status === 'DELIVERED' && !shipment.deliveredAt ? new Date() : undefined,
    },
  });
}
