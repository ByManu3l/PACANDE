import { config } from 'dotenv';
import { beforeEach } from 'vitest';

config({ path: '.env.test' });

/**
 * Salvaguarda: estas pruebas **vacían todas las tablas** antes de cada
 * caso. Si `DATABASE_URL` apuntara por error a la base de desarrollo o —
 * peor — a la de producción, el daño sería irreversible. Por eso se
 * comprueba el nombre antes de importar nada que pueda conectarse.
 */
if (!process.env.DATABASE_URL?.includes('pacande_test')) {
  throw new Error(
    'Las pruebas no se ejecutan: DATABASE_URL no apunta a la base de pruebas ' +
      '(pacande_test). Revisa tu archivo .env.test — la plantilla está en ' +
      '.env.test.example. Esta comprobación existe para que una configuración ' +
      'equivocada no pueda vaciar la base de desarrollo.',
  );
}

// Se importa después de garantizar que DATABASE_URL es la base de pruebas.
const { prisma } = await import('@/lib/prisma');

/** Tablas que no son datos de la aplicación y deben sobrevivir. */
const NO_VACIAR = ['_prisma_migrations'];

let tablasCache: string[] | null = null;

/**
 * Nombres de todas las tablas de la aplicación, leídos del catálogo de
 * Postgres.
 *
 * Se consultan en vez de escribirlas a mano: una lista fija obliga a
 * recordar este archivo cada vez que se añade un modelo, y olvidarlo
 * produce fallos desconcertantes —pruebas que pasan por separado y fallan
 * en conjunto, porque las filas de un caso se filtran al siguiente.
 * Justo eso ocurrió al añadir cupones.
 *
 * Se cachea porque el esquema no cambia durante una ejecución.
 */
async function tablasDeLaAplicacion(): Promise<string[]> {
  if (tablasCache) return tablasCache;

  const filas = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  tablasCache = filas.map((f) => f.tablename).filter((t) => !NO_VACIAR.includes(t));
  return tablasCache;
}

/**
 * Vacía todas las tablas antes de cada caso.
 *
 * `TRUNCATE ... CASCADE` en una sola sentencia resuelve el orden de las
 * claves foráneas por su cuenta, a diferencia de una secuencia de
 * `deleteMany` que hay que ordenar a mano y se rompe al añadir una
 * relación. `RESTART IDENTITY` reinicia los contadores de secuencia, de
 * modo que cada caso arranca desde el mismo estado.
 */
export async function resetDatabase() {
  const tablas = await tablasDeLaAplicacion();
  if (tablas.length === 0) return;

  const lista = tablas.map((t) => `"public"."${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}

beforeEach(async () => {
  await resetDatabase();
});
