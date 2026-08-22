import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Prisma 7 usa *driver adapters*: ya no hay un motor binario que lea
 * `DATABASE_URL` por su cuenta, así que el pool de conexiones se conecta
 * explícitamente aquí.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

/**
 * Cliente único de base de datos. **Toda** consulta del proyecto pasa por
 * aquí, y solo desde `lib/services/*` (ver `docs/ARQUITECTURA.md`).
 *
 * Se guarda en `globalThis` fuera de producción porque el hot reload de
 * Next.js reevalúa los módulos en cada cambio: sin esto, cada recarga
 * crearía un `PrismaClient` nuevo y en pocos minutos se agotarían las
 * conexiones de Postgres. En producción los módulos se evalúan una sola
 * vez, así que la variable global no hace falta.
 */
export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
