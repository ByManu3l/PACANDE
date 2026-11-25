import { describe, expect, it } from 'vitest';

import { addItem } from '@/lib/services/cart.service';
import { cartTotals, getCart } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import { getDiscountedProducts } from '@/lib/services/product.service';
import { prisma } from '@/lib/prisma';
import { ahorroPorDescuento, precioConDescuento, tieneDescuento } from '@/lib/utils/discount';

import { createCategory, createProduct, createUser } from './factories';

const SHIPPING_ADDRESS = {
  recipientName: 'Test Buyer',
  line1: 'Calle 1 #2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
  country: 'CO',
  phone: '3000000000',
  paymentMethod: 'contra_entrega' as const,
};

describe('precioConDescuento', () => {
  it('deja el precio intacto sin descuento', () => {
    expect(precioConDescuento(10000, 0).toString()).toBe('10000');
  });

  it('aplica el porcentaje', () => {
    expect(precioConDescuento(10000, 20).toString()).toBe('8000');
    expect(precioConDescuento(1999, 50).toString()).toBe('999.5');
  });

  it('es exacto en decimal, no en coma flotante', () => {
    // 0.1 + 0.2 !== 0.3 en binario. Con Decimal, un 10% sobre 0.3 da
    // exactamente 0.27, no 0.27000000000000002.
    expect(precioConDescuento('0.3', 10).toString()).toBe('0.27');
  });

  it('acota porcentajes fuera de rango en vez de producir importes absurdos', () => {
    expect(precioConDescuento(10000, 150).toString()).toBe('0');
    expect(precioConDescuento(10000, -30).toString()).toBe('10000');
    expect(precioConDescuento(10000, Number.NaN).toString()).toBe('10000');
  });

  it('calcula el ahorro como la diferencia con el precio de lista', () => {
    expect(ahorroPorDescuento(10000, 25).toString()).toBe('2500');
    expect(ahorroPorDescuento(10000, 0).toString()).toBe('0');
  });

  it('reconoce si hay oferta vigente', () => {
    expect(tieneDescuento(0)).toBe(false);
    expect(tieneDescuento(15)).toBe(true);
  });
});

describe('el descuento llega hasta el cobro', () => {
  it('el pedido cobra el precio rebajado, no el de lista', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, {
      price: 100000,
      stock: 10,
      discountPercent: 30,
    });

    await addItem({ userId: user.id }, product.id, 2);
    const { order } = await checkout(user.id, SHIPPING_ADDRESS);

    const guardado = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });

    // 100.000 − 30% = 70.000 por unidad; 2 unidades = 140.000.
    expect(guardado.items[0].unitPrice.toString()).toBe('70000');
    expect(guardado.items[0].lineTotal.toString()).toBe('140000');
    expect(guardado.subtotal.toString()).toBe('140000');
  });

  it('el subtotal del carrito coincide con lo que se cobrará', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, {
      price: 50000,
      stock: 5,
      discountPercent: 40,
    });

    await addItem({ userId: user.id }, product.id, 3);
    const cart = await getCart({ userId: user.id });
    const { subtotal } = cartTotals(cart!);

    const { order } = await checkout(user.id, SHIPPING_ADDRESS);
    const guardado = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    // Es la garantía que importa: lo que se enseña antes de pagar y lo
    // que se cobra son el mismo número.
    expect(subtotal).toBe(Number(guardado.subtotal));
    expect(subtotal).toBe(90000); // 50.000 − 40% = 30.000 × 3
  });
});

describe('getDiscountedProducts', () => {
  it('devuelve solo lo rebajado y disponible, con el mayor descuento primero', async () => {
    const category = await createCategory();
    await createProduct(category.id, { name: 'Sin oferta', discountPercent: 0 });
    await createProduct(category.id, { name: 'Rebaja pequeña', discountPercent: 10 });
    await createProduct(category.id, { name: 'Rebaja grande', discountPercent: 45 });
    await createProduct(category.id, { name: 'Agotado', discountPercent: 50, stock: 0 });

    const ofertas = await getDiscountedProducts();
    const nombres = ofertas.map((p) => p.name);

    expect(nombres).toEqual(['Rebaja grande', 'Rebaja pequeña']);
    expect(nombres).not.toContain('Sin oferta');
    // Una oferta que no se puede comprar solo genera frustración.
    expect(nombres).not.toContain('Agotado');
  });
});
