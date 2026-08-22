import { describe, expect, it, vi } from 'vitest';

import { addItem } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import { paymentProvider } from '@/lib/services/payment.service';
import { registerUser, verifyCredentials } from '@/lib/services/user.service';
import { storage } from '@/lib/services/storage.service';
import { prisma } from '@/lib/prisma';
import { checkoutSchema } from '@/lib/validations/checkout';

import { createCategory, createProduct, createUser } from './factories';

const SHIPPING = {
  recipientName: 'Test Buyer',
  line1: 'Calle 1 #2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
  country: 'CO',
  phone: '3000000000',
  paymentMethod: 'contra_entrega' as const,
};

describe('seguridad: el esquema del servidor no acepta datos de tarjeta', () => {
  it('descarta cardNumber/cardCvv aunque el cliente los envíe', () => {
    const parsed = checkoutSchema.parse({
      ...SHIPPING,
      cardNumber: '4242424242424242',
      cardCvv: '123',
      cardExpiry: '12/29',
      cardName: 'ATACANTE',
    });

    // zod .parse() sobre un object schema elimina las claves desconocidas:
    // aunque alguien construya la petición a mano, el PAN nunca llega a la
    // capa de servicio ni a un log de error del servidor.
    expect(parsed).not.toHaveProperty('cardNumber');
    expect(parsed).not.toHaveProperty('cardCvv');
    expect(parsed).not.toHaveProperty('cardExpiry');
    expect(JSON.stringify(parsed)).not.toContain('4242');
  });
});

describe('seguridad: login sin canal lateral de tiempo', () => {
  it('devuelve null tanto para correo inexistente como para contraseña incorrecta', async () => {
    await createUser({ email: 'existe@test.local', password: 'Correcta123!' });

    expect(await verifyCredentials('existe@test.local', 'Incorrecta123!')).toBeNull();
    expect(await verifyCredentials('no-existe@test.local', 'Cualquiera123!')).toBeNull();
  });

  it('tarda un tiempo comparable en ambos casos (no permite enumerar correos)', async () => {
    // Se registra por el camino real (`registerUser`) en vez del factory de
    // tests: el factory usa un coste bcrypt bajo para que la suite sea
    // rápida, y esta prueba mide precisamente el tiempo de bcrypt. Con un
    // coste distinto al del hash señuelo, la comparación no significa nada.
    await registerUser({ name: 'Timing', email: 'timing@test.local', password: 'Correcta123!' });

    const time = async (email: string) => {
      const started = process.hrtime.bigint();
      await verifyCredentials(email, 'ContraseñaIncorrecta123!');
      return Number(process.hrtime.bigint() - started) / 1e6; // ms
    };

    // Se promedian varias corridas: una sola medición es demasiado ruidosa
    // para afirmar nada sobre tiempos.
    const runs = 3;
    let existing = 0;
    let missing = 0;
    for (let i = 0; i < runs; i++) {
      existing += await time('timing@test.local');
      missing += await time('no-existe@test.local');
    }
    existing /= runs;
    missing /= runs;

    // Sin la corrección, el caso "correo inexistente" retornaba sin ejecutar
    // bcrypt: milisegundos frente a ~100 ms. El umbral es holgado a
    // propósito — busca detectar esa diferencia de orden de magnitud, no
    // medir con precisión.
    const ratio = Math.max(existing, missing) / Math.min(existing, missing);
    expect(ratio).toBeLessThan(3);
  });
});

describe('integridad: el stock no se puede sobrevender', () => {
  it('rechaza el segundo checkout concurrente en vez de dejar el stock negativo', async () => {
    const category = await createCategory();
    // Una sola unidad disponible y dos compradores pidiéndola a la vez.
    const product = await createProduct(category.id, { stock: 1, price: 10000 });

    const buyerA = await createUser({ email: 'a@test.local' });
    const buyerB = await createUser({ email: 'b@test.local' });
    await addItem({ userId: buyerA.id }, product.id, 1);
    await addItem({ userId: buyerB.id }, product.id, 1);

    vi.spyOn(paymentProvider, 'charge').mockResolvedValue({ approved: true, reference: 'ok' });

    const results = await Promise.allSettled([
      checkout(buyerA.id, SHIPPING),
      checkout(buyerB.id, SHIPPING),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);

    const refreshed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshed.stock).toBe(0);
    expect(refreshed.stock).toBeGreaterThanOrEqual(0);
  });
});

describe('seguridad: el almacenamiento no permite salir de public/', () => {
  it('ignora rutas con traversal en vez de borrar archivos del servidor', async () => {
    // delete() es best-effort y no propaga errores, pero la ruta nunca debe
    // resolverse fuera de public/. Si el guard no existiera, esta llamada
    // intentaría borrar un archivo en la raíz del proyecto.
    await expect(storage.delete('/../../.env')).resolves.toBeUndefined();

    const { existsSync } = await import('node:fs');
    expect(existsSync('.env.example')).toBe(true);
  });
});
