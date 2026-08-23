import { expect, test as setup } from '@playwright/test';

import { ESTADOS, USUARIOS } from './sesiones';

/**
 * Inicia sesión una vez por rol y guarda las cookies en disco.
 *
 * **Por qué existe:** el proyecto limita los intentos de acceso a cinco
 * por cuarto de hora desde la misma dirección. Una suite en la que cada
 * prueba entra por su cuenta agota ese límite y empieza a fallar por un
 * motivo que no tiene nada que ver con lo que se está probando —así se
 * descubrió, cuando el límite recién añadido tumbó la suite entera.
 *
 * Reutilizar la sesión es además el patrón recomendado por Playwright y
 * mucho más rápido: entrar por la interfaz cuesta segundos por prueba.
 *
 * Las pruebas que verifican el acceso en sí (`auth.spec.ts`) siguen
 * entrando de verdad. Son pocas y caben de sobra en el límite.
 */
for (const [rol, usuario] of Object.entries(USUARIOS)) {
  setup(`sesión de ${rol}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(usuario.email);
    await page.getByLabel('Contraseña').fill(usuario.password);

    // Acotado al botón de envío: la barra de navegación también tiene un
    // enlace "Iniciar sesión" que se renderiza con role=button.
    await page.locator('button[type="submit"]', { hasText: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL('/');

    await page.context().storageState({ path: ESTADOS[rol as keyof typeof USUARIOS] });
  });
}
