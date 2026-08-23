import { defineConfig, devices } from '@playwright/test';

import { ESTADOS } from './tests/e2e/sesiones';

/**
 * Runs against the dev server + dev database (the one seeded by
 * `prisma db seed`), not the isolated Vitest test database — these are
 * full user-journey checks, not unit tests, and rely on the seeded demo
 * accounts (see prisma/seed.ts) and catalog existing.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // shared seeded accounts/cart state — avoid cross-test interference
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Inicia sesión una vez por rol y guarda las cookies. El resto de
    // proyectos dependen de este, así que las pruebas arrancan ya
    // autenticadas y no gastan intentos del límite de acceso.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // Pruebas que empiezan sin sesión: `auth.spec.ts` porque prueba el
    // acceso en sí, y `shopping.spec.ts` porque ejercita la compra como
    // invitado y la fusión del carrito al registrarse.
    {
      name: 'acceso',
      testMatch: /(auth|shopping)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // `permissions.spec.ts` necesita varios roles y también la ausencia de
    // sesión, así que abre su propio contexto en cada caso a partir de las
    // sesiones guardadas.
    {
      name: 'permisos',
      testMatch: /permissions\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },

    // El resto arranca con la sesión de cliente ya puesta.
    {
      name: 'cliente',
      testIgnore: /(auth|permissions|shopping)\.spec\.ts|auth\.setup\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: ESTADOS.user },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
