import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}

test('a visitor can register, land authenticated, log out, and log back in', async ({ page }) => {
  const email = uniqueEmail('register');
  const password = 'E2ePassword123!';

  await page.goto('/registro');
  await page.getByLabel('Nombre').fill('E2E Registrado');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL('/');
  await page.goto('/cuenta');
  // La página de perfil muestra el correo dentro de un <input>, no como
  // texto suelto, así que hay que comprobar su valor.
  await expect(page.getByLabel('Correo')).toHaveValue(email);

  // Cerrar sesión desde el formulario del menú de cuenta.
  await page.evaluate(async () => {
    const csrfRes = await fetch('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, callbackUrl: '/' }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  // Scoped to the submit button — the Navbar also has an "Iniciar sesión"
  // enlace que se renderiza con role=button y colisionaría con un
  // getByRole genérico.
  await page.locator('button[type="submit"]', { hasText: 'Iniciar sesión' }).click();

  await expect(page).toHaveURL('/');
  await page.goto('/cuenta');
  // La página de perfil muestra el correo dentro de un <input>, no como
  // texto suelto, así que hay que comprobar su valor.
  await expect(page.getByLabel('Correo')).toHaveValue(email);
});

test('login rejects an incorrect password with a visible error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').fill('superadmin@pacande.test');
  await page.getByLabel('Contraseña').fill('WrongPassword!');
  // Scoped to the submit button — the Navbar also has an "Iniciar sesión"
  // enlace que se renderiza con role=button y colisionaría con un
  // getByRole genérico.
  await page.locator('button[type="submit"]', { hasText: 'Iniciar sesión' }).click();

  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL('/login');
});
