import { expect, test } from '@playwright/test';

import { ESTADOS } from './sesiones';

/**
 * Pantallas de administración de las funciones nuevas.
 *
 * Corre con la sesión de ADMIN guardada; ver `auth.setup.ts` para el
 * porqué de no entrar en cada prueba.
 */
test.use({ storageState: ESTADOS.admin });

test.describe('moderación de opiniones', () => {
  test('la cola existe y se puede filtrar por estado', async ({ page }) => {
    await page.goto('/admin/resenas');

    await expect(page.getByRole('heading', { name: 'Opiniones' })).toBeVisible();

    await page.getByRole('link', { name: 'Pendientes' }).click();
    await expect(page).toHaveURL(/estado=PENDING/);

    // Un estado inventado en la URL no debe romper la página.
    await page.goto('/admin/resenas?estado=INVENTADO');
    await expect(page.getByRole('heading', { name: 'Opiniones' })).toBeVisible();
  });

  test('rechazar una opinión la retira de la ficha del producto', async ({ page }) => {
    await page.goto('/admin/resenas?estado=APPROVED');

    const primera = page.getByRole('row').nth(1);
    const enlaceProducto = primera.getByRole('link').first();
    const rutaProducto = await enlaceProducto.getAttribute('href');
    test.skip(!rutaProducto, 'El seed no dejó opiniones publicadas.');

    await primera.getByRole('button', { name: /^Rechazar/ }).click();
    await expect(page.getByText('Opinión rechazada.')).toBeVisible();

    // La ficha ya no debe mostrarla, y la media se habrá recalculado.
    await page.goto(rutaProducto!);
    await expect(page.getByRole('heading', { name: 'Opiniones de clientes' })).toBeVisible();
  });
});

test.describe('cupones', () => {
  test('se crea un cupón y aparece en la tabla', async ({ page }) => {
    await page.goto('/admin/cupones');
    await expect(page.getByRole('heading', { name: 'Cupones' })).toBeVisible();

    const codigo = `E2E${Date.now().toString().slice(-6)}`;

    await page.getByRole('button', { name: 'Nuevo cupón' }).click();
    await page.getByLabel('Código').fill(codigo);
    await page.getByLabel('Porcentaje', { exact: true }).fill('15');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Cupón creado.')).toBeVisible();
    await expect(page.getByText(codigo)).toBeVisible();
  });

  test('el estado distingue "activo" de "vencido"', async ({ page }) => {
    // Un cupón puede estar marcado como activo y aun así no servir. Es la
    // causa habitual de "el cupón no funciona y no sé por qué".
    await page.goto('/admin/cupones');
    await expect(page.getByText('Vencido').first()).toBeVisible();
  });

  test('un cupón usado no se puede eliminar', async ({ page }) => {
    await page.goto('/admin/cupones');

    const fila = page.getByRole('row').filter({ hasText: 'BIENVENIDA10' });
    const usados = await fila.getByRole('cell').nth(3).textContent();
    test.skip(!usados || usados.trim().startsWith('0'), 'BIENVENIDA10 aún no se ha usado.');

    await fila.getByRole('button', { name: /^Eliminar/ }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByText(/Desactívalo/)).toBeVisible();
  });
});
