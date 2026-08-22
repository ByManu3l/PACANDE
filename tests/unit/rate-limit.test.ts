import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enforceRateLimit, type RateLimitRule } from '@/lib/rate-limit';
import { ValidationError } from '@/lib/utils/errors';

// `enforceRateLimit` lee la IP de las cabeceras de la petición, que en una
// prueba unitaria no existen. Se sustituye `next/headers` para poder
// controlar quién es el solicitante en cada caso.
const cabeceras = { 'x-forwarded-for': '203.0.113.1' };

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => cabeceras[name as keyof typeof cabeceras] ?? null,
  }),
}));

const REGLA: RateLimitRule = {
  limit: 3,
  windowMs: 60_000,
  message: 'Demasiados intentos.',
};

let contador = 0;
/** Ámbito distinto en cada caso: el almacén es un módulo compartido. */
function ambitoUnico() {
  contador += 1;
  return `prueba-${contador}`;
}

beforeEach(() => {
  cabeceras['x-forwarded-for'] = '203.0.113.1';
});

describe('límite de intentos', () => {
  it('permite exactamente los intentos configurados', async () => {
    const scope = ambitoUnico();

    for (let i = 0; i < REGLA.limit; i++) {
      await expect(enforceRateLimit(REGLA, scope)).resolves.not.toThrow();
    }
  });

  it('rechaza el intento siguiente al límite', async () => {
    const scope = ambitoUnico();

    for (let i = 0; i < REGLA.limit; i++) await enforceRateLimit(REGLA, scope);

    await expect(enforceRateLimit(REGLA, scope)).rejects.toThrow(ValidationError);
    await expect(enforceRateLimit(REGLA, scope)).rejects.toThrow('Demasiados intentos.');
  });

  it('cuenta por separado cada ámbito', async () => {
    // Agotar los intentos de acceso no debe impedir registrarse: son
    // operaciones distintas y compartir contador bloquearía de más.
    const login = ambitoUnico();
    const registro = ambitoUnico();

    for (let i = 0; i < REGLA.limit + 1; i++) {
      await enforceRateLimit(REGLA, login).catch(() => {});
    }

    await expect(enforceRateLimit(REGLA, registro)).resolves.not.toThrow();
  });

  it('cuenta por separado cada discriminador', async () => {
    // Varias personas tras la misma IP —una oficina— no deben bloquearse
    // entre sí por intentar entrar con cuentas distintas.
    const scope = ambitoUnico();

    for (let i = 0; i < REGLA.limit + 1; i++) {
      await enforceRateLimit(REGLA, scope, 'ana@ejemplo.test').catch(() => {});
    }

    await expect(enforceRateLimit(REGLA, scope, 'luis@ejemplo.test')).resolves.not.toThrow();
  });

  it('cuenta por separado cada dirección de origen', async () => {
    const scope = ambitoUnico();

    for (let i = 0; i < REGLA.limit + 1; i++) {
      await enforceRateLimit(REGLA, scope).catch(() => {});
    }

    cabeceras['x-forwarded-for'] = '198.51.100.7';
    await expect(enforceRateLimit(REGLA, scope)).resolves.not.toThrow();
  });

  it('toma la primera dirección cuando el proxy encadena varias', async () => {
    // `x-forwarded-for` acumula los proxies intermedios: la primera es la
    // del cliente real. Tomar otra agruparía a todos los que pasan por el
    // mismo proxy bajo un único contador.
    const scope = ambitoUnico();
    cabeceras['x-forwarded-for'] = '203.0.113.9, 70.41.3.18, 150.172.238.178';

    for (let i = 0; i < REGLA.limit; i++) await enforceRateLimit(REGLA, scope);

    // La misma cadena, con proxies distintos detrás: mismo cliente, mismo
    // contador, así que este intento ya debe rechazarse.
    cabeceras['x-forwarded-for'] = '203.0.113.9, 10.0.0.1';
    await expect(enforceRateLimit(REGLA, scope)).rejects.toThrow(ValidationError);
  });

  it('sigue aplicando el límite cuando no hay cabecera de origen', async () => {
    // Sin cabecera se usa una clave común. Es preferible agrupar a todos
    // los desconocidos bajo un mismo contador que dejarlos pasar sin
    // límite alguno.
    const scope = ambitoUnico();
    cabeceras['x-forwarded-for'] = '';

    for (let i = 0; i < REGLA.limit; i++) await enforceRateLimit(REGLA, scope);
    await expect(enforceRateLimit(REGLA, scope)).rejects.toThrow(ValidationError);
  });

  it('vuelve a permitir intentos cuando la ventana expira', async () => {
    const scope = ambitoUnico();
    const reglaCorta: RateLimitRule = { ...REGLA, windowMs: 20 };

    for (let i = 0; i < reglaCorta.limit; i++) await enforceRateLimit(reglaCorta, scope);
    await expect(enforceRateLimit(reglaCorta, scope)).rejects.toThrow(ValidationError);

    await new Promise((resolve) => setTimeout(resolve, 30));
    await expect(enforceRateLimit(reglaCorta, scope)).resolves.not.toThrow();
  });
});
