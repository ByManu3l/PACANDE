import { expect, test } from '@playwright/test';

/**
 * Flujos de las funciones añadidas en la re-auditoría: cupones,
 * favoritos, filtros y galería.
 *
 * Van en un navegador real y no en pruebas unitarias porque lo que se
 * comprueba aquí es el cableado entre capas —que el código del cupón
 * llegue del carrito al checkout, que el corazón persista entre
 * páginas—, y eso solo se rompe en la integración.
 */

/**
 * Estas pruebas corren en el proyecto «cliente», que arranca con la sesión
 * ya iniciada desde `auth.setup.ts`. Entrar en cada una agotaría el límite
 * de cinco intentos por cuarto de hora y la suite fallaría por un motivo
 * ajeno a lo que comprueba.
 */

test.describe('cupones de descuento', () => {
  test('un cupón válido descuenta del total y viaja hasta el checkout', async ({ page }) => {
    await page.goto('/producto/ropa-hombre-camiseta-gris');
    await page.getByRole('button', { name: 'Añadir al carrito' }).click();
    await expect(page.getByText('Producto agregado al carrito.')).toBeVisible();

    await page.goto('/carrito');

    // El total antes de aplicar nada.
    const resumen = page.getByRole('heading', { name: 'Resumen' }).locator('..');
    const totalAntes = await resumen.getByText(/^\$/).last().textContent();

    await page.getByLabel('¿Tienes un cupón?').fill('BIENVENIDA10');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    await expect(page.getByText('Cupón BIENVENIDA10 aplicado.')).toBeVisible();
    await expect(page.getByText(/Descuento \(BIENVENIDA10\)/)).toBeVisible();

    const totalDespues = await resumen.getByText(/^\$/).last().textContent();
    expect(totalDespues).not.toBe(totalAntes);

    // El código tiene que sobrevivir al salto al checkout: si se perdiera,
    // el cliente vería el descuento en el carrito y no en la compra.
    await page.getByRole('link', { name: 'Proceder al pago' }).click();
    await expect(page).toHaveURL(/\/checkout\?cupon=BIENVENIDA10/);
    await expect(page.getByText(/Descuento \(BIENVENIDA10\)/)).toBeVisible();
  });

  test('un cupón vencido explica el motivo, no dice solo «no válido»', async ({ page }) => {
    await page.goto('/producto/ropa-hombre-camiseta-gris');
    await page.getByRole('button', { name: 'Añadir al carrito' }).click();

    await page.goto('/carrito');
    await page.getByLabel('¿Tienes un cupón?').fill('NAVIDAD2025');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    await expect(page.getByText(/venció/)).toBeVisible();
  });

  test('un cupón inexistente se rechaza', async ({ page }) => {
    await page.goto('/producto/ropa-hombre-camiseta-gris');
    await page.getByRole('button', { name: 'Añadir al carrito' }).click();

    await page.goto('/carrito');
    await page.getByLabel('¿Tienes un cupón?').fill('NOEXISTE99');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    await expect(page.getByText(/no existe|disponible/)).toBeVisible();
  });
});

test.describe('favoritos', () => {
  test('sin sesión, el corazón lleva al login en vez de fallar', async ({ browser }) => {
    // Contexto limpio: este proyecto trae la sesión puesta y aquí hace
    // falta justamente lo contrario.
    const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await contexto.newPage();

    await page.goto('/categoria/ropa-hombre');
    await page.getByRole('button', { name: 'Guardar en favoritos' }).first().click();

    await expect(page).toHaveURL(/\/login/);
    await contexto.close();
  });

  test('con sesión, guardar persiste al recargar', async ({ page }) => {
    await page.goto('/producto/ropa-mujer-camiseta');

    // `.first()`: la ficha tiene el botón principal y uno por cada
    // producto relacionado.
    await page.getByRole('button', { name: 'Guardar en favoritos' }).first().click();

    // El estado real está en el servidor: recargar es lo que distingue
    // «se guardó» de «solo cambió el color del icono».
    await page.reload();
    await expect(page.getByRole('button', { name: 'Quitar de favoritos' }).first()).toBeVisible();

    // Y se puede deshacer.
    await page.getByRole('button', { name: 'Quitar de favoritos' }).first().click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Guardar en favoritos' }).first()).toBeVisible();
  });
});

test.describe('filtros del catálogo', () => {
  test('los filtros viven en la URL y sobreviven a una recarga', async ({ page }) => {
    await page.goto('/buscar?q=camiseta');

    // El recuento sale de la barra de filtros, acotado por su icono para
    // no capturar por error el texto de una tarjeta de producto.
    const contador = page
      .locator('p')
      .filter({ hasText: /^\d+ productos?$/ })
      .first();
    const totalSinFiltrar = (await contador.textContent())?.trim();

    await page.getByRole('link', { name: 'Precio: menor a mayor' }).click();
    await expect(page).toHaveURL(/sort=precio-asc/);

    // Recargar no debe perder el filtro: es la diferencia entre un filtro
    // en la URL y uno en estado de cliente.
    await page.reload();
    await expect(page).toHaveURL(/sort=precio-asc/);

    await page.getByRole('link', { name: 'Solo disponibles' }).click();
    await expect(page).toHaveURL(/stock=1/);
    // El orden anterior no puede perderse al añadir otro filtro.
    await expect(page).toHaveURL(/sort=precio-asc/);

    // Limpiar no puede llevarse por delante el término buscado.
    await page.getByRole('link', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/q=camiseta/);
    await expect(page).not.toHaveURL(/sort=|stock=/);
    await expect(contador).toHaveText(totalSinFiltrar!);
  });
});

test.describe('ficha de producto', () => {
  test('la galería cambia de imagen al pulsar una miniatura', async ({ page }) => {
    await page.goto('/producto/deportes-baloncesto-canasta-de-baloncesto');

    const principal = page.getByRole('img', { name: /imagen 1 de 3/ });
    await expect(principal).toBeVisible();

    await page.getByRole('button', { name: 'Ver imagen 2 de 3' }).click();
    await expect(page.getByRole('img', { name: /imagen 2 de 3/ })).toBeVisible();
  });

  test('muestra migas de pan y productos relacionados', async ({ page }) => {
    await page.goto('/producto/ropa-hombre-camiseta-gris');

    await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'También te puede interesar' })).toBeVisible();
  });

  test('la sección de opiniones dice qué puede hacer quien mira', async ({ page }) => {
    await page.goto('/producto/ropa-hombre-camiseta-gris');

    // Cuatro estados posibles, todos informativos: se comprueba que
    // aparece uno y no un formulario que el servidor vaya a rechazar.
    await expect(
      page
        .getByText(
          /Solo quienes compraron|Inicia sesión|Ya publicaste|Tu calificación|todavía no tiene opiniones/,
        )
        .first(),
    ).toBeVisible();
  });
});
