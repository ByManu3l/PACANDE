import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      /**
       * `server-only` publica dos variantes: una vacía bajo la condición
       * `react-server` y otra que lanza al importarse, que es como impide
       * que un módulo de servidor acabe en el bundle del cliente. Vitest
       * resuelve la segunda y hace fallar todo lo que —directa o
       * indirectamente— importe `lib/env.ts`: prácticamente la suite
       * entera.
       *
       * Se apunta a un sustituto vacío. Ver `tests/stubs/server-only.ts`
       * para el razonamiento completo.
       */
      'server-only': './tests/stubs/server-only.ts',
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['./tests/unit/setup.ts'],
    // Las pruebas de servicios usan una Postgres real (ver
    // tests/unit/setup.ts). Se ejecutan en serie para que el vaciado de
    // tablas entre casos no pueda solaparse.
    fileParallelism: false,
  },
});
