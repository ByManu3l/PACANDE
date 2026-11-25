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
  await page.getByRole('button', { name: 'Agregar al Carrito', exact: true }).click();
  await expect(page.getByText('Producto agregado al carrito.')).toBeVisible();

  await page.goto('/carrito');
  await expect(page.getByText(productName!.trim())).toBeVisible();
});

test('guest checkout requires login, and completes end-to-end once authenticated', async ({
  page,
}) => {
  // Se añade al carrito como invitado para ejercitar también la fusión
  // del carrito anónimo al registrarse.
  await page.goto('/producto/tecnologia-accesorios-adaptador-hdmi');
  await page.getByRole('button', { name: 'Agregar al Carrito', exact: true }).click();
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

  // Registrarse con la cookie de carrito anónimo puesta debe haberlo
  // fusionado en el carrito de la cuenta.
  await page.goto('/carrito');
  await expect(page.getByText('Adaptador HDMI')).toBeVisible();

  await page.goto('/checkout');
  await page.getByLabel('Nombre de quien recibe').fill('E2E Comprador');
  await page.getByLabel('Dirección').fill('Calle 1 #2-3');
  await page.getByLabel('Ciudad').fill('Bogotá');
  await page.getByLabel('Departamento').fill('Cundinamarca');
  await page.getByLabel('Código postal').fill('110111');
  await page.getByLabel('Teléfono').fill('3000000000');
  // getByLabel encajaría con el span[role=radio] visible y también con
  // el input nativo oculto que Base UI renderiza por semántica de
  // formulario. Se apunta al rol para desambiguar.
  await page.getByRole('radio', { name: 'Pago contra entrega' }).check();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmacion\/PCD-/);
  // getByText también encaja con el anunciador de rutas de Next.js (una
  // región live fuera de pantalla que repite el encabezado por
  // accesibilidad). Se acota al encabezado real para evitar la colisión
  // del modo estricto de Playwright.
  await expect(page.getByRole('heading', { name: '¡Gracias por tu compra!' })).toBeVisible();
});
