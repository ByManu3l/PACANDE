'use server';

import { revalidatePath } from 'next/cache';

import { Prisma } from '@/generated/prisma/client';
import { requireRole, requireSession } from '@/lib/auth/guards';
import { getCurrentCart } from '@/lib/cart-session';
import { cartTotals } from '@/lib/services/cart.service';
import * as couponService from '@/lib/services/coupon.service';
import { runAction } from '@/lib/utils/action-result';
import { applyCouponSchema, couponSchema } from '@/lib/validations/coupon';

/**
 * Cupones de descuento.
 *
 * `applyCouponAction` es solo una **vista previa**: dice si el código
 * sirve y cuánto descontaría, para que el cliente lo vea antes de pagar.
 * No reserva nada ni cambia el pedido. El descuento que se cobra lo
 * recalcula `order.service.ts` dentro de la transacción de la compra, con
 * el carrito de ese momento.
 *
 * Esa duplicación es intencional: sin la vista previa, el cliente
 * escribiría el código a ciegas; sin el recálculo final, el navegador
 * podría decidir su propio descuento.
 */

/**
 * Comprueba un código contra el carrito actual y devuelve el descuento
 * que aplicaría.
 *
 * El subtotal se calcula aquí desde el carrito guardado, no se recibe del
 * cliente: si llegara como parámetro, cualquiera podría pedir la vista
 * previa de un cupón con un subtotal inventado para superar su compra
 * mínima.
 */
export async function applyCouponAction(input: unknown) {
  return runAction(async () => {
    await requireSession();
    const { code } = applyCouponSchema.parse(input);

    const cart = await getCurrentCart();
    if (!cart || cart.items.length === 0) {
      throw new Error('Tu carrito está vacío.');
    }

    const { subtotal } = cartTotals(cart);
    const aplicado = await couponService.validateCoupon(code, new Prisma.Decimal(subtotal));

    // `Decimal` no es serializable al cruzar al cliente; se envía como
    // texto y `formatPrice` lo entiende.
    return { code: aplicado.code, discount: aplicado.discount.toString() };
  });
}

// ---------------------------------------------------------------------------
// Panel de administración
// ---------------------------------------------------------------------------

export async function listCouponsAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  const cupones = await couponService.listCoupons();

  return cupones.map((c) => ({
    ...c,
    value: c.value.toString(),
    minPurchase: c.minPurchase?.toString() ?? null,
    maxDiscount: c.maxDiscount?.toString() ?? null,
  }));
}

/**
 * Convierte los datos del formulario al tipo del servicio.
 *
 * Las fechas llegan como texto de un `<input type="date">`; el resto de
 * campos opcionales llegan vacíos cuando no se rellenan, y aquí se
 * traducen a `null`, que es lo que significa «sin límite».
 */
function toInput(datos: ReturnType<typeof couponSchema.parse>) {
  return {
    code: datos.code,
    description: datos.description,
    type: datos.type,
    value: datos.value,
    minPurchase: datos.minPurchase ?? null,
    maxDiscount: datos.maxDiscount ?? null,
    maxUses: datos.maxUses ?? null,
    startsAt: datos.startsAt ?? null,
    endsAt: datos.endsAt ?? null,
    isActive: datos.isActive,
  };
}

export async function createCouponAction(input: unknown) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await couponService.createCoupon(toInput(couponSchema.parse(input)));
    revalidatePath('/admin/cupones');
  });
}

export async function updateCouponAction(id: string, input: unknown) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await couponService.updateCoupon(id, toInput(couponSchema.parse(input)));
    revalidatePath('/admin/cupones');
  });
}

export async function deleteCouponAction(id: string) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await couponService.deleteCoupon(id);
    revalidatePath('/admin/cupones');
  });
}
