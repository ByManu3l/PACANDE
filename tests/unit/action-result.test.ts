import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { runAction } from '@/lib/utils/action-result';
import { ForbiddenError } from '@/lib/utils/errors';

const schema = z.object({ nombre: z.string().min(2, 'El nombre es muy corto.') });

describe('runAction', () => {
  it('devuelve los datos cuando todo va bien', async () => {
    const result = await runAction(async () => ({ ok: 1 }));
    expect(result).toEqual({ success: true, data: { ok: 1 } });
  });

  it('propaga el mensaje de un AppError tal cual', async () => {
    const result = await runAction(async () => {
      throw new ForbiddenError('No tienes permisos.');
    });
    expect(result).toEqual({ success: false, error: 'No tienes permisos.' });
  });

  it('propaga el mensaje de un Error plano tal cual', async () => {
    const result = await runAction(async () => {
      throw new Error('Selecciona al menos una imagen.');
    });
    expect(result).toEqual({ success: false, error: 'Selecciona al menos una imagen.' });
  });

  it('muestra el mensaje del campo cuando falla un schema de zod', async () => {
    // Cinco actions validan con `schema.parse()`, que lanza ZodError.
    // Antes de esta corrección, ZodError caía en la rama de "error
    // inesperado" y el usuario veía un mensaje genérico en vez de saber
    // qué campo estaba mal.
    const result = await runAction(async () => schema.parse({ nombre: 'a' }));

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toBe('El nombre es muy corto.');
  });

  it('oculta el detalle de una excepción inesperada', async () => {
    // Un TypeError, un error de Prisma o cualquier fallo no previsto no
    // debe filtrar su mensaje al cliente: puede contener nombres de
    // tabla, rutas de archivo o fragmentos de consulta.
    const registrado = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const detalle = 'connect ECONNREFUSED 127.0.0.1:5432 en tabla "User"';

    const result = await runAction(async () => {
      throw new TypeError(detalle);
    });

    expect(result).toEqual({
      success: false,
      error: 'Ocurrió un error inesperado. Intenta de nuevo.',
    });

    // Y el detalle no puede haberse colado en el mensaje devuelto.
    expect(JSON.stringify(result)).not.toContain('ECONNREFUSED');

    // Pero sí debe quedar registrado en el servidor, con la excepción
    // original, para poder depurarlo.
    expect(registrado).toHaveBeenCalledOnce();
    expect(registrado.mock.calls[0][1]).toBeInstanceOf(TypeError);
    registrado.mockRestore();
  });
});
