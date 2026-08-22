import { prisma } from '@/lib/prisma';

/**
 * Comprobaciones de estado del sistema.
 *
 * Vive en `services/` como cualquier otro acceso a datos: la ruta
 * `/api/health` no consulta Prisma directamente, igual que ninguna otra
 * (ver la regla de capas en `docs/ARQUITECTURA.md`).
 */

export interface CheckResult {
  ok: boolean;
  latencyMs: number;
  /** Solo para los registros del servidor; nunca se devuelve al cliente. */
  error?: unknown;
}

/**
 * Comprueba que la base de datos responde.
 *
 * Usa `SELECT 1` en lugar de contar filas de alguna tabla: mide el camino
 * de ida y vuelta sin depender de que exista ningún dato, y su coste no
 * crece con el tamaño de la tienda — importante, porque un supervisor
 * llama a esto cada pocos minutos, para siempre.
 *
 * La latencia se devuelve incluso cuando falla: un fallo tras 30 segundos
 * (agotamiento del pool de conexiones) y uno instantáneo (base caída) son
 * problemas distintos, y el tiempo es lo que los distingue.
 */
export async function checkDatabase(): Promise<CheckResult> {
  const inicio = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - inicio };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - inicio, error };
  }
}
