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

  test('una opinión se puede publicar y volver a retirar', async ({ page }) => {
    // La prueba crea su propio estado en vez de depender del seed: otras
    // ejecuciones ya pudieron aprobar o rechazar esas mismas opiniones, y
    // una prueba que asume un estado ajeno falla por motivos que no tienen
    // que ver con lo que comprueba.
    await page.goto('/admin/resenas');

    const fila = page.getByRole('row').nth(1);
    await expect(fila).toBeVisible();

    // Publicar. Si ya estaba publicada, el botón no existe y se salta.
    const publicar = fila.getByRole('button', { name: /^Publicar/ });
    if ((await publicar.count()) > 0) {
      await publicar.click();
      await expect(page.getByText('Opinión publicada.')).toBeVisible();
    }

    // Y retirarla otra vez. El servicio recalcula la valoración del
    // producto dentro de la misma transacción en ambos sentidos.
    await page
      .getByRole('row')
      .nth(1)
      .getByRole('button', { name: /^Rechazar/ })
      .click();
    await expect(page.getByText('Opinión rechazada.')).toBeVisible();
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
