import { afterEach, describe, expect, it, vi } from 'vitest';

import { addItem } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import { paymentProvider } from '@/lib/services/payment.service';
import { getStockAlerts } from '@/lib/services/stock.service';
import { prisma } from '@/lib/prisma';
import { compararUrgencia, evaluarStock } from '@/lib/utils/stock';

import { createCategory, createProduct, createUser } from './factories';

const SHIPPING_ADDRESS = {
  recipientName: 'Test Buyer',
  line1: 'Calle 1 #2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
  country: 'CO',
  phone: '3000000000',
  paymentMethod: 'tarjeta_simulada' as const,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('evaluarStock', () => {
  it('marca agotado sin unidades y sugiere el mínimo objetivo', () => {
    const e = evaluarStock(0, 0);
    expect(e.nivel).toBe('agotado');
    expect(e.unidadesSugeridas).toBe(15);
  });

  it('marca bajo con 5 unidades o menos aunque no se venda', () => {
    expect(evaluarStock(5, 0).nivel).toBe('bajo');
    expect(evaluarStock(6, 0).nivel).toBe('ok');
  });

  it('marca bajo si al ritmo de venta no alcanza para 14 días', () => {
    // 60 vendidas en 30 días = 2 al día; 20 unidades duran 10 días.
    const e = evaluarStock(20, 60);
    expect(e.nivel).toBe('bajo');
    expect(e.diasDeCobertura).toBe(10);
    // Objetivo: 30 días de ventas = 60 unidades; faltan 40.
    expect(e.unidadesSugeridas).toBe(40);
  });

  it('no avisa si las unidades alcanzan para el ritmo de venta', () => {
    // 15 vendidas en 30 días = 0,5 al día; 20 unidades duran 40 días.
    const e = evaluarStock(20, 15);
    expect(e.nivel).toBe('ok');
    expect(e.unidadesSugeridas).toBe(0);
  });

  it('ordena primero lo agotado y luego lo que antes se acaba', () => {
    const lista = [evaluarStock(4, 0), evaluarStock(20, 60), evaluarStock(0, 0)];
    const ordenada = [...lista].sort(compararUrgencia);
    expect(ordenada.map((e) => e.nivel)).toEqual(['agotado', 'bajo', 'bajo']);
    expect(ordenada[1]?.diasDeCobertura).toBe(10);
  });
});

describe('getStockAlerts', () => {
  it('avisa del producto que se vende rápido y de la sección casi vacía', async () => {
    const seccion = await createCategory({ name: 'Sección de prueba' });
    const rapido = await createProduct(seccion.id, { name: 'Rápido', stock: 20 });
    await createProduct(seccion.id, { name: 'Tranquilo', stock: 50 });
    const agotado = await createProduct(seccion.id, { name: 'Agotado', stock: 0 });

    // Una venta pagada de 15 unidades: 0,5 al día; quedan 5 → stock bajo.
    const user = await createUser();
    await addItem({ userId: user.id }, rapido.id, 15);
    vi.spyOn(paymentProvider, 'charge').mockResolvedValue({ approved: true, reference: 'ok' });
    await checkout(user.id, SHIPPING_ADDRESS);

    const { porReponer, seccionesConPocoSurtido } = await getStockAlerts();

    expect(porReponer.map((p) => p.id)).toEqual([agotado.id, rapido.id]);
    expect(porReponer[1]).toMatchObject({ stock: 5, vendidas: 15, nivel: 'bajo' });

    // Dos productos disponibles de tres: por debajo del mínimo de la sección.
    expect(seccionesConPocoSurtido).toContainEqual(
      expect.objectContaining({ slug: seccion.slug, disponibles: 2, total: 3 }),
    );
  });

  it('ignora productos inactivos', async () => {
    const seccion = await createCategory();
    const p = await createProduct(seccion.id, { stock: 0 });
    await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });

    const { porReponer } = await getStockAlerts();
    expect(porReponer.find((x) => x.id === p.id)).toBeUndefined();
  });
});
