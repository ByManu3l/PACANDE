import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}

test('browse a category, view a product, add it to the cart, and see it in /carrito', async ({
  page,
}) => {
  await page.goto('/categoria/ropa-hombre');
  await expect(page.getByRole('heading', { name: 'Hombre' })).toBeVisible();

  await page.getByRole('link').filter({ hasText: '$' }).first().click();
  await expect(page).toHaveURL(/\/producto\//);

  const productName = await page.getByRole('heading', { level: 1 }).textContent();
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByText('Producto agregado al carrito.')).toBeVisible();

  await page.goto('/carrito');
  await expect(page.getByText(productName!.trim())).toBeVisible();
});

test('guest checkout requires login, and completes end-to-end once authenticated', async ({
  page,
}) => {
  // Add to cart as a guest first, to also exercise the guest-cart-merge path.
  await page.goto('/producto/tecnologia-accesorios-adaptador-hdmi');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByText('Producto agregado al carrito.')).toBeVisible();

  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/login/);

  const email = uniqueEmail('checkout');
  const password = 'E2ePassword123!';
  await page.goto('/registro');
  await page.getByLabel('Nombre').fill('E2E Comprador');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL('/');

  // Registering while the guest cart cookie was set should have merged it.
  await page.goto('/carrito');
  await expect(page.getByText('Adaptador HDMI')).toBeVisible();

  await page.goto('/checkout');
  await page.getByLabel('Nombre de quien recibe').fill('E2E Comprador');
  await page.getByLabel('Dirección').fill('Calle 1 #2-3');
  await page.getByLabel('Ciudad').fill('Bogotá');
  await page.getByLabel('Departamento').fill('Cundinamarca');
  await page.getByLabel('Código postal').fill('110111');
  await page.getByLabel('Teléfono').fill('3000000000');
  // getByLabel matches both the visible span[role=radio] and the hidden
  // native input Base UI renders for form semantics — target the role.
  await page.getByRole('radio', { name: 'Pago contra entrega' }).check();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmacion\/PCD-/);
  // getByText also matches Next.js's route announcer (an off-screen live
  // region echoing the new page's heading for accessibility) — scope to
  // the actual heading to avoid that strict-mode collision.
  await expect(page.getByRole('heading', { name: '¡Gracias por tu compra!' })).toBeVisible();
});
