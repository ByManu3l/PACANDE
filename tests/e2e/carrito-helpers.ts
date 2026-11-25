import { expect, type Page } from '@playwright/test';

/**
 * Vacía el carrito del usuario de la sesión, desde la interfaz.
 *
 * **Por qué hace falta:** las pruebas que añaden al carrito y no compran
 * dejan las unidades ahí. Tras suficientes ejecuciones el carrito acumula
 * más unidades de las que hay en stock, y la validación de `addItem` —que
 * funciona correctamente— rechaza el siguiente añadido. La prueba falla
 * entonces por estado heredado y no por lo que comprueba.
 *
 * Se hace por la interfaz y no por la base de datos para no acoplar las
 * pruebas de navegador al esquema, y de paso ejercita el borrado de línea.
 */
export async function vaciarCarrito(page: Page) {
  await page.goto('/carrito');

  // De una en una: la lista se vuelve a renderizar tras cada borrado y
  // los localizadores previos quedan obsoletos.
  //
  // Cada borrado es una Server Action que deshabilita su botón mientras
  // corre. Hay que esperar a que el botón vuelva a estar operativo antes
  // de pulsar el siguiente —no una espera fija— o se hace clic sobre un
  // botón deshabilitado y el helper falla por una carrera, no por un fallo
  // real de la aplicación.
  for (let i = 0; i < 30; i++) {
    const eliminar = page.getByRole('button', { name: /^Eliminar .* del carrito$/ });
    if ((await eliminar.count()) === 0) break;

    const primero = eliminar.first();
    await expect(primero).toBeEnabled();
    await primero.click();

    // La línea desaparece del DOM cuando el servidor confirma el borrado.
    await expect(primero).toBeHidden();
  }

  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
}
