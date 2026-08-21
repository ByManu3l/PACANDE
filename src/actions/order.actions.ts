'use server';

import { revalidatePath } from 'next/cache';

import type { ShipmentStatus } from '@/generated/prisma/client';
import { requireRole, requireSession } from '@/lib/auth/guards';
import * as orderService from '@/lib/services/order.service';
import * as shipmentService from '@/lib/services/shipment.service';
import { runAction } from '@/lib/utils/action-result';
import { checkoutSchema } from '@/lib/validations/checkout';

export async function checkoutAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Datos de envío inválidos.');
    }

    const result = await orderService.checkout(user.id, parsed.data);
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

export async function listAllOrdersAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  const orders = await orderService.listAllOrders();
  // Decimal fields aren't serializable across the Server Action -> Client
  // Component boundary (see cart.actions.ts / product.actions.ts for the
  // same fix) — this table is refetched directly from a Client Component.
  return orders.map((o) => ({
    ...o,
    subtotal: o.subtotal.toString(),
    shippingCost: o.shippingCost.toString(),
    total: o.total.toString(),
    items: o.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
  }));
}

export async function updateShipmentStatusAction(orderId: string, status: ShipmentStatus) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await shipmentService.updateShipmentStatus(orderId, status);
    revalidatePath('/admin/pedidos');
  });
}
