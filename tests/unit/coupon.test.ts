import { describe, expect, it } from 'vitest';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { addItem } from '@/lib/services/cart.service';
import {
  calculateDiscount,
  createCoupon,
  deleteCoupon,
  normalizeCode,
  validateCoupon,
} from '@/lib/services/coupon.service';
import { checkout } from '@/lib/services/order.service';
import { ConflictError, ValidationError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

const D = (n: number | string) => new Prisma.Decimal(n);

function base(over: Partial<Parameters<typeof createCoupon>[0]> = {}) {
  return {
    code: `CUPON${Math.random().toString(36).slice(2, 8)}`,
    type: 'PERCENTAGE' as const,
    value: 10,
    isActive: true,
    ...over,
  };
}

const ENVIO_SEED = 10_000; // siteConfig.flatShippingCost

/** Prepara un usuario con un producto en el carrito, listo para comprar. */
async function carritoCon(precio: number, cantidad = 1) {
  const user = await createUser();
  const category = await createCategory();
  const product = await createProduct(category.id, { price: precio, stock: 100 });
  await addItem({ userId: user.id }, product.id, cantidad);
  return { user, product, subtotal: precio * cantidad };
}

const ENVIO = {
  recipientName: 'Ana Pérez',
  line1: 'Calle 1 #2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
  country: 'CO',
  phone: '3000000000',
  paymentMethod: 'contra_entrega' as const,
};

describe('calculateDiscount', () => {
  const cupon = (over: Partial<Prisma.CouponCreateInput> = {}) =>
    ({
      type: 'PERCENTAGE',
      value: D(10),
      maxDiscount: null,
      ...over,
    }) as never;

  it('aplica el porcentaje sobre el subtotal', () => {
    expect(calculateDiscount(cupon(), D(100_000)).toString()).toBe('10000');
  });

  it('resta el importe fijo tal cual', () => {
    const c = cupon({ type: 'FIXED', value: D(15_000) });
    expect(calculateDiscount(c, D(100_000)).toString()).toBe('15000');
  });

  it('respeta el tope de descuento en los porcentuales', () => {
    // Un 50% sobre un carrito grande puede costar mucho más de lo que la
    // campaña preveía; `maxDiscount` es el freno.
    const c = cupon({ value: D(50), maxDiscount: D(20_000) });
    expect(calculateDiscount(c, D(1_000_000)).toString()).toBe('20000');
  });

  it('nunca descuenta más que el subtotal', () => {
    // Sin este tope, un cupón fijo mayor que la compra daría un total
    // negativo: pagarle al cliente por comprar.
    const c = cupon({ type: 'FIXED', value: D(500_000) });
    expect(calculateDiscount(c, D(30_000)).toString()).toBe('30000');
  });

  it('redondea a dos decimales', () => {
    const c = cupon({ value: D(33) });
    expect(calculateDiscount(c, D(100)).toString()).toBe('33');
    expect(calculateDiscount(cupon({ value: D(15) }), D(33.33)).toString()).toBe('5');
  });
});

describe('normalizeCode', () => {
  it('ignora mayúsculas y espacios', () => {
    // Pegar un código suele arrastrar un espacio invisible; sin normalizar
    // produce un "cupón no válido" que nadie sabe explicar.
    expect(normalizeCode('  verano25 ')).toBe('VERANO25');
  });
});

describe('validateCoupon', () => {
  it('explica por qué no aplica, en vez de un error genérico', async () => {
    await createCoupon(base({ code: 'CADUCADO', endsAt: new Date(Date.now() - 86_400_000) }));
    await expect(validateCoupon('CADUCADO', D(100_000))).rejects.toThrow(/venció/);

    await createCoupon(base({ code: 'FUTURO', startsAt: new Date(Date.now() + 86_400_000) }));
    await expect(validateCoupon('FUTURO', D(100_000))).rejects.toThrow(/todavía no/);

    await createCoupon(base({ code: 'MINIMO', minPurchase: 200_000 }));
    await expect(validateCoupon('MINIMO', D(100_000))).rejects.toThrow(/mínima/);

    await createCoupon(base({ code: 'AGOTADO', maxUses: 0 }));
    await expect(validateCoupon('AGOTADO', D(100_000))).rejects.toThrow(/límite de usos/);

    await createCoupon(base({ code: 'APAGADO', isActive: false }));
    await expect(validateCoupon('APAGADO', D(100_000))).rejects.toThrow(/no existe|disponible/);
  });

  it('acepta un cupón vigente y devuelve el descuento calculado', async () => {
    await createCoupon(base({ code: 'VALIDO', value: 20 }));
    const aplicado = await validateCoupon('valido', D(50_000));

    expect(aplicado.code).toBe('VALIDO');
    expect(aplicado.discount.toString()).toBe('10000');
  });

  it('rechaza códigos inexistentes', async () => {
    await expect(validateCoupon('NOEXISTE', D(50_000))).rejects.toThrow(ValidationError);
  });
});

describe('el cupón se aplica al comprar', () => {
  it('descuenta de la mercancía y no del envío', async () => {
    const { user, subtotal } = await carritoCon(100_000);
    await createCoupon(base({ code: 'DIEZ', value: 10 }));

    const { order } = await checkout(user.id, { ...ENVIO, couponCode: 'DIEZ' });

    expect(order.subtotal.toString()).toBe(String(subtotal));
    expect(order.discountAmount.toString()).toBe('10000');
    expect(order.shippingCost.toString()).toBe(String(ENVIO_SEED));
    // total = subtotal - descuento + envío
    expect(order.total.toString()).toBe(String(subtotal - 10_000 + ENVIO_SEED));
  });

  it('congela el código en el pedido, para que sobreviva al cupón', async () => {
    const { user } = await carritoCon(100_000);
    const cupon = await createCoupon(base({ code: 'EFIMERO' }));

    const { order } = await checkout(user.id, { ...ENVIO, couponCode: 'EFIMERO' });
    expect(order.couponCode).toBe('EFIMERO');

    // El pedido debe seguir explicando su propio importe aunque el cupón
    // desaparezca del catálogo de promociones.
    await prisma.coupon.delete({ where: { id: cupon.id } });
    const releido = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    expect(releido.couponCode).toBe('EFIMERO');
    expect(releido.discountAmount.toString()).toBe('10000');
    expect(releido.couponId).toBeNull();
  });

  it('consume un uso del cupón', async () => {
    const { user } = await carritoCon(100_000);
    const cupon = await createCoupon(base({ code: 'CONTADO', maxUses: 5 }));

    await checkout(user.id, { ...ENVIO, couponCode: 'CONTADO' });

    const releido = await prisma.coupon.findUniqueOrThrow({ where: { id: cupon.id } });
    expect(releido.usedCount).toBe(1);
  });

  it('rechaza la compra si el cupón se agotó mientras tanto', async () => {
    const { user } = await carritoCon(100_000);
    await createCoupon(base({ code: 'ULTIMO', maxUses: 1 }));

    // Alguien más lo consumió entre que el cliente lo escribió y pagó.
    await prisma.coupon.update({ where: { code: 'ULTIMO' }, data: { usedCount: 1 } });

    await expect(checkout(user.id, { ...ENVIO, couponCode: 'ULTIMO' })).rejects.toThrow(
      ValidationError,
    );
  });

  it('no gasta el cupón si la compra falla', async () => {
    // El carrito está vacío, así que el checkout revienta. El cupón no
    // puede quedar consumido por una compra que no ocurrió.
    const user = await createUser();
    const cupon = await createCoupon(base({ code: 'INTACTO', maxUses: 5 }));

    await expect(checkout(user.id, { ...ENVIO, couponCode: 'INTACTO' })).rejects.toThrow();

    const releido = await prisma.coupon.findUniqueOrThrow({ where: { id: cupon.id } });
    expect(releido.usedCount).toBe(0);
  });

  it('compra sin cupón: descuento cero, no nulo', async () => {
    const { user, subtotal } = await carritoCon(80_000);
    const { order } = await checkout(user.id, ENVIO);

    expect(order.couponCode).toBeNull();
    expect(order.discountAmount.toString()).toBe('0');
    expect(order.total.toString()).toBe(String(subtotal + ENVIO_SEED));
  });
});

describe('administración de cupones', () => {
  it('rechaza códigos duplicados, sin distinguir mayúsculas', async () => {
    await createCoupon(base({ code: 'UNICO' }));
    await expect(createCoupon(base({ code: 'unico' }))).rejects.toThrow(ConflictError);
  });

  it('no borra un cupón que ya se usó', async () => {
    const { user } = await carritoCon(100_000);
    const cupon = await createCoupon(base({ code: 'USADO' }));
    await checkout(user.id, { ...ENVIO, couponCode: 'USADO' });

    // Borrarlo dejaría sin respuesta "¿cuánto costó esta campaña?".
    await expect(deleteCoupon(cupon.id)).rejects.toThrow(/Desactívalo/);
  });

  it('borra un cupón que nunca se usó', async () => {
    const cupon = await createCoupon(base({ code: 'NUNCAUSADO' }));
    await expect(deleteCoupon(cupon.id)).resolves.not.toThrow();
  });
});
