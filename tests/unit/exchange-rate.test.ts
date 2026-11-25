import { afterEach, describe, expect, it, vi } from 'vitest';

import { addItem } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import { convertirImporte, getExchangeRates } from '@/lib/services/exchange-rate.service';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/config/site.config';

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('convertirImporte', () => {
  it('convierte con la tasa dada', () => {
    expect(convertirImporte(100000, 'USD', { USD: 0.00025 })).toBe(25);
  });

  it('devuelve null si no hay tasa para esa moneda', () => {
    // Preferimos no enseñar conversión a enseñar una inventada.
    expect(convertirImporte(100000, 'JPY', { USD: 0.00025 })).toBeNull();
  });

  it('rechaza tasas corruptas en vez de producir precios absurdos', () => {
    expect(convertirImporte(100000, 'USD', { USD: 0 })).toBeNull();
    expect(convertirImporte(100000, 'USD', { USD: -1 })).toBeNull();
    expect(convertirImporte(100000, 'USD', { USD: Number.NaN })).toBeNull();
  });
});

describe('getExchangeRates', () => {
  it('cae a las tasas de respaldo si la fuente falla, sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caída')));

    const { tasas, enVivo } = await getExchangeRates();

    expect(enVivo).toBe(false);
    // La tienda tiene que seguir mostrando precios aunque el tercero esté
    // caído: es la diferencia entre una referencia desactualizada y una
    // página que no carga.
    for (const moneda of siteConfig.displayCurrencies) {
      expect(tasas[moneda]).toBeGreaterThan(0);
    }
  });

  it('descarta una tasa inválida y usa el respaldo de esa moneda', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { USD: 0, EUR: 0.0002, MXN: 'no-es-un-número' } }),
      }),
    );

    const { tasas } = await getExchangeRates();

    expect(tasas.EUR).toBe(0.0002);
    expect(tasas.USD).toBeGreaterThan(0);
    expect(tasas.MXN).toBeGreaterThan(0);
  });
});

describe('la conversión nunca toca lo que se cobra', () => {
  it('el pedido se guarda en la moneda base aunque la fuente devuelva cualquier cosa', async () => {
    // Una tasa disparatada de un tercero no debe poder alterar un cobro.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { USD: 999, EUR: 999, MXN: 999 } }),
      }),
    );

    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 50000, stock: 5 });

    await addItem({ userId: user.id }, product.id, 2);
    const { order } = await checkout(user.id, SHIPPING_ADDRESS);

    const guardado = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    // 50.000 × 2, en la moneda de la tienda. Sin rastro de conversión.
    expect(guardado.subtotal.toString()).toBe('100000');
  });
});
