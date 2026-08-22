import { type Coupon, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ConflictError, isUniqueViolation, ValidationError } from '@/lib/utils/errors';

/**
 * Cupones de descuento.
 *
 * **La regla que no se puede relajar:** el importe del descuento lo
 * calcula siempre el servidor, a partir del carrito real. El navegador
 * solo envía el código. Aceptar un descuento calculado por el cliente es
 * la misma vulnerabilidad que aceptar precios del cliente — permite
 * comprar a un céntimo — y es un error frecuente porque «el cupón ya se
 * validó al escribirlo» parece razonable.
 *
 * Validar y aplicar son operaciones distintas a propósito:
 *
 * - `validateCoupon` responde «¿sirve este código para este carrito?».
 *   Se usa mientras el cliente escribe, para dar respuesta inmediata. No
 *   consume nada.
 * - `redeemCoupon` reserva un uso, y corre **dentro de la transacción del
 *   pedido**. Es la que cuenta.
 */

/** Cupón aplicable, con el descuento ya calculado para este carrito. */
export interface AppliedCoupon {
  couponId: string;
  code: string;
  discount: Prisma.Decimal;
}

/**
 * Normaliza un código escrito a mano.
 *
 * Se guarda y se busca en mayúsculas sin espacios, así que «verano25 » y
 * «VERANO25» son el mismo cupón. Sin esto, un espacio invisible al pegar
 * el código produce un «cupón no válido» que nadie sabe explicar.
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Calcula el descuento que corresponde a un subtotal.
 *
 * Función pura y exportada para poder probarla directamente: es la
 * aritmética donde un error cuesta dinero en cada compra.
 *
 * Dos límites, en este orden:
 *
 * 1. `maxDiscount` acota los porcentuales. Un 50 % sobre un carrito
 *    grande puede costar mucho más de lo que la campaña preveía.
 * 2. El descuento **nunca supera el subtotal**. Sin ese tope, un cupón de
 *    importe fijo mayor que la compra produciría un total negativo, es
 *    decir, pagarle al cliente por comprar.
 *
 * El envío queda fuera del cálculo a propósito: se descuenta sobre la
 * mercancía, no sobre el transporte.
 */
export function calculateDiscount(coupon: Coupon, subtotal: Prisma.Decimal): Prisma.Decimal {
  let descuento =
    coupon.type === 'PERCENTAGE'
      ? subtotal.mul(coupon.value).div(100)
      : new Prisma.Decimal(coupon.value);

  if (coupon.maxDiscount && descuento.gt(coupon.maxDiscount)) {
    descuento = new Prisma.Decimal(coupon.maxDiscount);
  }
  if (descuento.gt(subtotal)) {
    descuento = subtotal;
  }

  return descuento.toDecimalPlaces(2);
}

/**
 * Comprueba si un código es aplicable a un subtotal dado.
 *
 * Los mensajes de error dicen **por qué** no sirve —caducado, aún no
 * empezó, falta importe mínimo— en vez de un «cupón no válido» genérico.
 * Un cliente al que le falta poco para el mínimo suele añadir algo más;
 * uno que no sabe qué pasa, abandona.
 *
 * No consume el cupón: eso lo hace `redeemCoupon` al confirmar la compra.
 *
 * @throws {ValidationError} con el motivo concreto.
 */
export async function validateCoupon(
  rawCode: string,
  subtotal: Prisma.Decimal,
): Promise<AppliedCoupon> {
  const code = normalizeCode(rawCode);
  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || !coupon.isActive) {
    throw new ValidationError('El cupón no existe o ya no está disponible.');
  }

  const ahora = new Date();
  if (coupon.startsAt && coupon.startsAt > ahora) {
    throw new ValidationError('Este cupón todavía no está vigente.');
  }
  if (coupon.endsAt && coupon.endsAt < ahora) {
    throw new ValidationError('Este cupón ya venció.');
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new ValidationError('Este cupón alcanzó su límite de usos.');
  }
  if (coupon.minPurchase && subtotal.lt(coupon.minPurchase)) {
    throw new ValidationError(
      `Este cupón requiere una compra mínima de ${coupon.minPurchase.toString()}.`,
    );
  }

  const discount = calculateDiscount(coupon, subtotal);
  if (discount.lte(0)) {
    throw new ValidationError('Este cupón no aplica descuento a tu carrito.');
  }

  return { couponId: coupon.id, code: coupon.code, discount };
}

/**
 * Reserva un uso del cupón. Debe correr dentro de la transacción del
 * pedido.
 *
 * El incremento es **condicional**, con la misma forma que el descuento de
 * stock: `WHERE usedCount < maxUses` en la misma sentencia que el
 * `increment`. Comprobar antes e incrementar después dejaría una ventana
 * en la que dos compras simultáneas leen el mismo `usedCount`, ambas ven
 * que queda cupo y ambas consumen — un cupón «de 100 usos» acabaría con
 * 105 pedidos.
 *
 * Un cupón sin `maxUses` no tiene tope que comprobar, así que basta con
 * incrementar.
 *
 * @throws {ValidationError} si el cupón se agotó mientras se pagaba.
 */
export async function redeemCoupon(tx: Prisma.TransactionClient, couponId: string): Promise<void> {
  const { count } = await tx.coupon.updateMany({
    where: {
      id: couponId,
      isActive: true,
      OR: [{ maxUses: null }, { usedCount: { lt: prisma.coupon.fields.maxUses } }],
    },
    data: { usedCount: { increment: 1 } },
  });

  if (count === 0) {
    throw new ValidationError('El cupón se agotó mientras completabas la compra.');
  }
}

// ---------------------------------------------------------------------------
// Panel de administración
// ---------------------------------------------------------------------------

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { orders: true } } },
  });
}

export interface CouponInput {
  code: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  maxUses?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
}

function toData(input: CouponInput) {
  return {
    code: normalizeCode(input.code),
    description: input.description || null,
    type: input.type,
    value: new Prisma.Decimal(input.value),
    minPurchase: input.minPurchase != null ? new Prisma.Decimal(input.minPurchase) : null,
    maxDiscount: input.maxDiscount != null ? new Prisma.Decimal(input.maxDiscount) : null,
    maxUses: input.maxUses ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
  };
}

export async function createCoupon(input: CouponInput) {
  try {
    return await prisma.coupon.create({ data: toData(input) });
  } catch (err) {
    if (isUniqueViolation(err, 'code')) {
      throw new ConflictError('Ya existe un cupón con ese código.');
    }
    throw err;
  }
}

/**
 * Actualiza un cupón.
 *
 * `usedCount` no se toca desde aquí: es un contador que solo avanza al
 * canjearse. Permitir editarlo a mano invalidaría el tope de usos, que es
 * justamente lo que ese contador protege.
 */
export async function updateCoupon(id: string, input: CouponInput) {
  try {
    return await prisma.coupon.update({ where: { id }, data: toData(input) });
  } catch (err) {
    if (isUniqueViolation(err, 'code')) {
      throw new ConflictError('Ya existe un cupón con ese código.');
    }
    throw err;
  }
}

/**
 * Elimina un cupón que no se haya usado nunca.
 *
 * Uno que ya se canjeó no se borra: los pedidos guardan su código y su
 * importe congelados, pero conservar la fila permite responder «¿cuánto
 * costó esta campaña?». Para retirarlo de circulación está `isActive`.
 */
export async function deleteCoupon(id: string) {
  return prisma.$transaction(async (tx) => {
    const usos = await tx.order.count({ where: { couponId: id } });
    if (usos > 0) {
      throw new ValidationError(
        `No se puede eliminar: se usó en ${usos} pedido(s). Desactívalo para retirarlo de circulación.`,
      );
    }
    await tx.coupon.delete({ where: { id } });
  });
}
