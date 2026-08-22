import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').fill('superadmin@pacande.test');
  await page.getByLabel('Contraseña').fill('Superadmin123!');
  await page.locator('button[type="submit"]', { hasText: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL('/');
});

test('admin can open the categories, products, orders and users panels', async ({ page }) => {
  await page.goto('/admin/categorias');
  await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nueva categoría' })).toBeVisible();

  await page.goto('/admin/productos');
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeVisible();

  await page.goto('/admin/pedidos');
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();

  await page.goto('/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
  await expect(page.getByText('superadmin@pacande.test')).toBeVisible();
});

test('creating and deleting a category round-trips through the table', async ({ page }) => {
  const name = `E2E Categoría ${Date.now()}`;

  await page.goto('/admin/categorias');
  await page.getByRole('button', { name: 'Nueva categoría' }).click();
  await page.getByLabel('Nombre').fill(name);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Categoría creada.')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(name) })).toBeVisible();

  const row = page.getByRole('row', { name: new RegExp(name) });
  await row.getByRole('button').last().click(); // delete trigger
  await page.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Categoría eliminada.')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(name) })).toHaveCount(0);
});
