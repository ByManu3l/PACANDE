import { expect, test } from '@playwright/test';

/** Páginas de cuenta. Corren en el proyecto «cliente», ya autenticado. */

test.describe('favoritos', () => {
  test('la página muestra lo guardado y refleja quitarlo', async ({ page }) => {
    await page.goto('/producto/ropa-ninos-camiseta-azul');
    await page.getByRole('button', { name: 'Guardar en favoritos' }).first().click();

    await page.goto('/cuenta/favoritos');
    await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Camiseta Azul/ }).first()).toBeVisible();

    // Quitarlo desde la propia lista debe vaciarla.
    await page.getByRole('button', { name: 'Quitar de favoritos' }).first().click();
    await page.reload();
    await expect(page.getByRole('link', { name: /Camiseta Azul/ })).toHaveCount(0);
  });
});

test.describe('libreta de direcciones', () => {
  test('se guarda una dirección y el checkout la ofrece', async ({ page }) => {
    await page.goto('/cuenta/direcciones');
    await expect(page.getByRole('heading', { name: 'Direcciones' })).toBeVisible();

    const etiqueta = `Casa ${Date.now().toString().slice(-5)}`;

    await page.getByRole('button', { name: 'Añadir dirección' }).click();
    await page.getByLabel('Nombre', { exact: true }).fill(etiqueta);
    await page.getByLabel('Quién recibe').fill('Ana Pérez');
    await page.getByLabel('Dirección', { exact: true }).fill('Calle 100 #15-20');
    await page.getByLabel('Ciudad').fill('Bogotá');
    await page.getByLabel('Departamento o estado').fill('Cundinamarca');
    await page.getByLabel('Código postal').fill('110111');
    await page.getByLabel('País').fill('CO');
    await page.getByLabel('Teléfono').fill('3001234567');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Dirección guardada.')).toBeVisible();
    await expect(page.getByText(etiqueta)).toBeVisible();

    // Siempre hay exactamente una predeterminada: la primera se marca
    // sola, y marcar otra desmarca la anterior. Una libreta sin ninguna
    // dejaría el checkout sin nada que preseleccionar.
    // `exact`: sin él, el localizador captura también el elemento padre
    // que contiene el distintivo, y el recuento sale doblado.
    await expect(page.getByText('Predeterminada', { exact: true })).toHaveCount(1);

    // Y el checkout debe ofrecerla, que es para lo que existe la libreta.
    await page.goto('/producto/ropa-mujer-camiseta');
    await page.getByRole('button', { name: 'Añadir al carrito' }).click();
    await page.goto('/checkout');

    await expect(page.getByText('Usar una dirección guardada')).toBeVisible();

    // Elegir la recién creada debe volcar sus datos en el formulario.
    await page.getByRole('button', { name: new RegExp(etiqueta) }).click();
    await expect(page.getByLabel('Nombre de quien recibe')).toHaveValue('Ana Pérez');
    await expect(page.getByLabel('Ciudad')).toHaveValue('Bogotá');
  });
});
