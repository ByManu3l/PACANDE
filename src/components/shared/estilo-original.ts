/**
 * Clases de las piezas que la versión original tomaba de Material UI
 * (carrito, pago, perfil): la tarjeta blanca con su sombra de elevación 1
 * y los botones en mayúsculas.
 *
 * Están aquí, y no repetidas en cada página, para que el «aspecto MUI» se
 * ajuste en un solo sitio.
 */

/** `<Card>` de MUI: esquinas de 4 px y la sombra de elevación 1. */
export const TARJETA_MUI =
  'rounded-[4px] bg-white text-[rgba(0,0,0,0.87)] shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_0_rgba(0,0,0,0.14),0_1px_3px_0_rgba(0,0,0,0.12)]';

const BOTON_MUI =
  'inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-[4px] px-4 py-1.5 text-[0.875rem] font-medium tracking-[0.02857em] uppercase transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60';

/** `<Button variant="contained">` en el rojo de la tienda. */
export const BOTON_MUI_ROJO = `${BOTON_MUI} bg-primary text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)] hover:bg-brand-dark focus-visible:ring-brand`;

/** `<Button variant="outlined" color="error">`. */
export const BOTON_MUI_CONTORNO = `${BOTON_MUI} border border-[rgba(211,47,47,0.5)] text-[#d32f2f] hover:border-[#d32f2f] hover:bg-[rgba(211,47,47,0.04)] focus-visible:ring-[#d32f2f]`;

/**
 * Botón de `PerfilPage.jsx`: rojo pleno, esquinas de 0.5 rem, a todo el
 * ancho, sube 2 px al pasar el cursor y se vuelve gris al deshabilitarse.
 */
export const BOTON_PERFIL =
  'bg-primary focus-visible:ring-brand relative mt-4 flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[0.5rem] px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-brand-dark focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:bg-[#999]';

/**
 * `BuyButton` / `CartButton` de `ProductCard.jsx`: rectángulo rojo sin
 * esquinas, 10 × 20 px de relleno y rojo oscuro al pasar el cursor.
 */
export const BOTON_TIENDA =
  'inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-none bg-primary px-5 py-2.5 text-white transition-colors duration-300 hover:not-disabled:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none';

/** Botón «Intentar nuevamente» de los errores de `OfertasPage.jsx`. */
export const BOTON_REINTENTAR =
  'inline-flex cursor-pointer items-center justify-center rounded-[8px] bg-[#dc3545] px-5 py-2.5 text-white transition-all duration-300 hover:bg-[#c82333] focus-visible:ring-2 focus-visible:ring-[#dc3545] focus-visible:ring-offset-2 focus-visible:outline-none';

/**
 * Título de página del panel de administración: el mismo de las páginas
 * de sección de la tienda, con la raya roja debajo.
 */
export const TITULO_ADMIN =
  "text-[2rem] leading-tight font-semibold text-[#2c3e50] after:mt-2 after:block after:h-1 after:w-[60px] after:rounded-sm after:bg-linear-to-r after:from-[#ff0000] after:to-[#ff4444] after:content-['']";
