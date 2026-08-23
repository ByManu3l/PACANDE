import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * Auditoría de accesibilidad de las páginas principales.
 *
 * **Por qué existe:** durante la re-auditoría aparecieron tres defectos
 * de accesibilidad reales —17 enlaces anunciados como botones, un menú
 * sin nombre accesible y dos controles interactivos anidados— y ninguno
 * lo detectó ESLint, TypeScript ni las pruebas funcionales. Los tres
 * habrían pasado inadvertidos otra vez sin esta comprobación.
 *
 * Se ejecuta `axe` sobre cada página. No cubre todo —ninguna herramienta
 * automática lo hace, y el orden de tabulación o la claridad de un
 * mensaje siguen exigiendo criterio humano— pero sí las categorías donde
 * el error es mecánico: contraste, nombres accesibles, etiquetas de
 * formulario, jerarquía de encabezados y roles ARIA mal aplicados.
 *
 * Se analizan las reglas de WCAG 2.1 en niveles A y AA, que es el listón
 * que exige la normativa en la mayoría de jurisdicciones.
 */

const NORMAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function analizar(page: Page) {
  return new AxeBuilder({ page }).withTags(NORMAS).analyze();
}

/** Formatea las infracciones para que el fallo diga qué arreglar. */
function describir(violaciones: Awaited<ReturnType<typeof analizar>>['violations']) {
  return violaciones
    .map((v) => {
      const nodos = v.nodes.slice(0, 3).map((n) => `      ${n.target.join(' ')}`);
      return [`  [${v.impact}] ${v.id}: ${v.help}`, ...nodos].join('\n');
    })
    .join('\n');
}

const PAGINAS = [
  { ruta: '/', nombre: 'portada' },
  { ruta: '/categoria/ropa-hombre', nombre: 'categoría' },
  { ruta: '/producto/ropa-hombre-camiseta-gris', nombre: 'ficha de producto' },
  { ruta: '/buscar?q=camiseta', nombre: 'búsqueda con filtros' },
  { ruta: '/carrito', nombre: 'carrito' },
  { ruta: '/cuenta', nombre: 'cuenta' },
  { ruta: '/cuenta/direcciones', nombre: 'direcciones' },
  { ruta: '/cuenta/favoritos', nombre: 'favoritos' },
];

for (const { ruta, nombre } of PAGINAS) {
  test(`la ${nombre} no tiene infracciones de accesibilidad`, async ({ page }) => {
    await page.goto(ruta);

    const resultado = await analizar(page);

    expect(
      resultado.violations,
      resultado.violations.length > 0
        ? `${resultado.violations.length} infracción(es) en ${ruta}:\n${describir(resultado.violations)}`
        : '',
    ).toEqual([]);
  });
}

test('el login es accesible', async ({ browser }) => {
  // Contexto limpio: el proyecto «cliente» trae sesión y redirigiría.
  const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await contexto.newPage();

  await page.goto('/login');
  const resultado = await analizar(page);

  expect(resultado.violations, describir(resultado.violations)).toEqual([]);
  await contexto.close();
});

test('los enlaces con aspecto de botón siguen siendo enlaces', async ({ page }) => {
  // Regresión concreta: `Button render={<Link/>}` producía
  // `<a role="button">`, y ese rol sustituye al de enlace. Un lector de
  // pantalla anunciaba «botón» para controles que navegan.
  await page.goto('/buscar?q=camiseta');

  const conRolBoton = await page.locator('a[role="button"]').count();
  expect(conRolBoton, 'Ningún <a> debe declarar role="button": navega, no actúa.').toBe(0);
});
