import { expect, type Page, test } from '@playwright/test';

/** Row lookup by exact email cell (not by the row's whole accessible name,
 * which would substring-match "superadmin@pacande.test" against a naive
 * "admin@pacande.test" pattern since one contains the other). */
function rowForEmail(page: Page, email: string) {
  return page.getByRole('cell', { name: email, exact: true }).locator('xpath=ancestor::tr');
}

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  // Scoped to the submit button — the Navbar also has an "Iniciar sesión"
  // enlace que se renderiza con role=button y colisionaría con un
  // getByRole genérico.
  await page.locator('button[type="submit"]', { hasText: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('route protection', () => {
  test('an anonymous visitor is redirected to /login from /admin, /cuenta and /checkout', async ({
    page,
  }) => {
    for (const path of ['/admin', '/cuenta', '/checkout']) {
      await page.goto(path);
      // Auth.js añade ?callbackUrl=... para devolver al visitante a donde
      // iba tras iniciar sesión, así que solo se comprueba la parte /login.
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('a plain USER cannot reach /admin', async ({ page }) => {
    await login(page, 'usuario@pacande.test', 'Usuario123!');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('an ADMIN or SUPERADMIN can reach /admin', async ({ page }) => {
    await login(page, 'superadmin@pacande.test', 'Superadmin123!');
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await expect(page.getByText('Panel de administración')).toBeVisible();
  });
});

test.describe('admin user-management restrictions (mirrors user.service.ts guards)', () => {
  test('an ADMIN sees "Sin permisos" for every row except plain USER accounts', async ({
    page,
  }) => {
    await login(page, 'admin@pacande.test', 'Admin123!');
    await page.goto('/admin/usuarios');

    await expect(
      rowForEmail(page, 'superadmin@pacande.test').getByText('Sin permisos'),
    ).toBeVisible();
    await expect(rowForEmail(page, 'admin@pacande.test').getByText('Sin permisos')).toBeVisible();
  });

  test('a SUPERADMIN sees no manage actions on their own row', async ({ page }) => {
    await login(page, 'superadmin@pacande.test', 'Superadmin123!');
    await page.goto('/admin/usuarios');

    await expect(
      rowForEmail(page, 'superadmin@pacande.test').getByText('Sin permisos'),
    ).toBeVisible();
  });
});
