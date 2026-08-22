import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { checkDatabase } from '@/lib/services/health.service';

/**
 * Comprobación de estado, en `/api/health`.
 *
 * Es lo que consulta un supervisor externo (UptimeRobot, Better Stack, la
 * sonda de un balanceador) para saber si la aplicación está viva. Sin
 * esto, la primera noticia de una caída la da un cliente que no pudo
 * comprar.
 *
 * Comprueba la base de datos, no solo que el proceso responda: una
 * aplicación que arranca pero no alcanza Postgres está caída a efectos
 * prácticos, y una sonda que solo devuelve «ok» no lo detectaría.
 *
 * Devuelve **503** cuando algo falla, no 200 con un cuerpo que diga
 * «error». Los supervisores se guían por el código de estado; un 200 se
 * lee como «todo bien» por muy alarmante que sea el contenido.
 *
 * No expone versiones, cadenas de conexión ni rastros de error: esta ruta
 * es pública y lo que aparezca aquí lo puede leer cualquiera.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const inicio = Date.now();
  const database = await checkDatabase();
  const ok = database.ok;

  if (!ok) {
    logger.error('La comprobación de estado falló', database.error, { check: 'database' });
  }

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      checks: {
        // Solo el veredicto y el tiempo. El motivo del fallo queda en los
        // registros del servidor, donde puede verlo quien opera y no
        // cualquiera que pida esta URL.
        database: { ok: database.ok, latencyMs: database.latencyMs },
      },
      uptimeSeconds: Math.round(process.uptime()),
      responseTimeMs: Date.now() - inicio,
    },
    {
      status: ok ? 200 : 503,
      // Nunca se cachea: una respuesta guardada diría que todo está bien
      // mucho después de que dejara de estarlo.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
