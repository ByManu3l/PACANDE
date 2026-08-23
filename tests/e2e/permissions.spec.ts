import { type Browser, expect, type Page, test } from '@playwright/test';

import { ESTADOS } from './sesiones';

/**
 * Matriz de permisos: qué puede alcanzar cada rol y qué acciones ve.
 *
 * **No entra por el formulario de acceso.** Usa las sesiones que guarda
 * `auth.setup.ts`, por dos razones: aquí se comprueba el control de
 * acceso, no el inicio de sesión —eso lo cubre `auth.spec.ts`—, y entrar
 * una vez por caso agotaría el límite de cinco intentos por cuarto de
 * hora, haciendo fallar la suite por un motivo ajeno a lo que prueba.
 *
 * Cada caso abre su propio contexto con la sesión del rol que necesita,
 * en lugar de fijar una en el proyecto: aquí hacen falta varios roles y
 * también la ausencia de sesión.
 */

/**
 * Busca la fila por la celda exacta del correo.
 *
 * No por el nombre accesible de la fila entera: un patrón ingenuo de
 * "admin@pacande.test" también encajaría con "superadmin@pacande.test",
 * porque uno contiene al otro.
 */
function rowForEmail(page: Page, email: string) {
  return page.getByRole('cell', { name: email, exact: true }).locator('xpath=ancestor::tr');
}

/** Abre una pestaña con la sesión guardada del rol indicado. */
async function comoRol(browser: Browser, rol: keyof typeof ESTADOS) {
  const contexto = await browser.newContext({ storageState: ESTADOS[rol] });
  return { contexto, page: await contexto.newPage() };
}

test.describe('protección de rutas', () => {
  test('un visitante sin sesión es redirigido al login desde /admin, /cuenta y /checkout', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await contexto.newPage();

    for (const ruta of ['/admin', '/cuenta', '/checkout']) {
      await page.goto(ruta);
      // Auth.js añade ?callbackUrl=... para devolver al visitante a donde
      // iba tras iniciar sesión, así que solo se comprueba la parte /login.
      await expect(page).toHaveURL(/\/login/);
    }

    await contexto.close();
  });

  test('un USER normal no puede entrar a /admin', async ({ browser }) => {
    const { contexto, page } = await comoRol(browser, 'user');

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);

    await contexto.close();
  });

  test('un SUPERADMIN sí puede entrar a /admin', async ({ browser }) => {
    const { contexto, page } = await comoRol(browser, 'superadmin');

    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await expect(page.getByText('Panel de administración')).toBeVisible();

    await contexto.close();
  });
});

test.describe('gestión de usuarios (refleja los guardas de user.service.ts)', () => {
  test('un ADMIN ve "Sin permisos" en toda fila que no sea de un USER', async ({ browser }) => {
    const { contexto, page } = await comoRol(browser, 'admin');
    await page.goto('/admin/usuarios');

    await expect(
      rowForEmail(page, 'superadmin@pacande.test').getByText('Sin permisos'),
    ).toBeVisible();
    await expect(rowForEmail(page, 'admin@pacande.test').getByText('Sin permisos')).toBeVisible();

    await contexto.close();
  });

  test('un SUPERADMIN no ve acciones sobre su propia fila', async ({ browser }) => {
    const { contexto, page } = await comoRol(browser, 'superadmin');
    await page.goto('/admin/usuarios');

    await expect(
      rowForEmail(page, 'superadmin@pacande.test').getByText('Sin permisos'),
    ).toBeVisible();

    await contexto.close();
  });
});
