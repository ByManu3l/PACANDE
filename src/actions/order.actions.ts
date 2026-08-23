'use server';

import { revalidatePath } from 'next/cache';

import type { ShipmentStatus } from '@/generated/prisma/client';
import { requireRole, requireSession } from '@/lib/auth/guards';
import * as orderService from '@/lib/services/order.service';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import * as shipmentService from '@/lib/services/shipment.service';
import { runAction } from '@/lib/utils/action-result';
import { checkoutSchema } from '@/lib/validations/checkout';

/**
 * Compra y gestion de pedidos.
 *
 * Nota de seguridad sobre `checkoutAction`: el formulario recoge datos de
 * tarjeta, pero **no llegan aqui**. El navegador solo envia los campos de
 * `CHECKOUT_SERVER_FIELDS` (direccion y metodo de pago); los de la tarjeta
 * los consume la pasarela simulada en el cliente y se descartan. Mantener
 * el numero de tarjeta fuera del servidor evita que aparezca en registros,
 * copias de seguridad o trazas de error, y deja el proyecto fuera del
 * alcance de PCI-DSS. Ver `lib/validations/checkout.ts`.
 */

export async function checkoutAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();
    await enforceRateLimit(RATE_LIMITS.checkout, 'checkout', user.id);

    const shipping = checkoutSchema.parse(Object.fromEntries(formData));

    const result = await orderService.checkout(user.id, shipping);
    revalidatePath('/carrito');
    revalidatePath('/cuenta/pedidos');

    if (!result.approved) {
      throw new Error(
        `Pago rechazado: ${result.declineReason ?? 'intenta con otro método.'} Tu carrito sigue intacto.`,
      );
    }

    return { orderNumber: result.order.orderNumber };
  });
}

export async function listAllOrdersAction(page = 1) {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  const pagina = await orderService.listAllOrders(page);
  const orders = pagina.items;
  // Los `Decimal` de Prisma no son serializables al cruzar de Server
  // Action a Client Component, y esta tabla se recarga desde el cliente.
  // Se convierten a texto, incluidos los de cada linea: `items` es un
  // arreglo anidado y el limite RSC tambien lo alcanza.
  return {
    ...pagina,
    items: orders.map((o) => ({
      ...o,
      subtotal: o.subtotal.toString(),
      shippingCost: o.shippingCost.toString(),
      total: o.total.toString(),
      discountAmount: o.discountAmount.toString(),
      items: o.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
    })),
  };
}

export async function updateShipmentStatusAction(orderId: string, status: ShipmentStatus) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await shipmentService.updateShipmentStatus(orderId, status);
    revalidatePath('/admin/pedidos');
  });
}
