import { Prisma } from '@/generated/prisma/client';

/**
 * Precio efectivo de un producto una vez aplicado su descuento.
 *
 * **Es la única fuente de verdad del precio de venta.** Escaparate,
 * carrito, checkout y pedido llaman aquí; ninguno multiplica por su
 * cuenta. Si cada capa hiciera su propio cálculo, bastaría con que una
 * redondeara distinto para enseñar un importe y cobrar otro.
 *
 * Aritmética en `Decimal` de principio a fin, como el resto de importes
 * del proyecto: `0.1 + 0.2 !== 0.3` en coma flotante binaria, y ese error
 * se acumula al sumar líneas de un pedido.
 *
 * El porcentaje se acota a 0-100 antes de aplicarlo. Un valor fuera de
 * rango solo puede venir de un dato corrupto, y prefiero un precio
 * sensato a un importe negativo propagándose hasta el cobro.
 */
export function precioConDescuento(
  price: Prisma.Decimal | string | number,
  discountPercent: number,
): Prisma.Decimal {
  const base = new Prisma.Decimal(price);

  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return base;

  const porcentaje = Math.min(Math.trunc(discountPercent), 100);

  // `(100 - d) / 100` en Decimal, con redondeo a 2 posiciones al final:
  // la columna es Decimal(12,2) y guardar más precisión de la que la base
  // acepta provocaría un redondeo distinto en el servidor.
  return base
    .mul(100 - porcentaje)
    .div(100)
    .toDecimalPlaces(2);
}

/** Importe que se ahorra frente al precio de lista. */
export function ahorroPorDescuento(
  price: Prisma.Decimal | string | number,
  discountPercent: number,
): Prisma.Decimal {
  const base = new Prisma.Decimal(price);
  return base.minus(precioConDescuento(base, discountPercent));
}

/** `true` si el producto está en oferta ahora mismo. */
export function tieneDescuento(discountPercent: number): boolean {
  return Number.isFinite(discountPercent) && discountPercent > 0;
}
