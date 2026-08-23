import type { Prisma } from '@/generated/prisma/client';

/**
 * Filtros y ordenamiento del catálogo.
 *
 * **Todo vive en la URL**, no en estado de cliente. Es lo que hace que un
 * resultado filtrado se pueda compartir por WhatsApp, funcione con el
 * botón «atrás» y sobreviva a una recarga. Guardarlo en `useState` rompe
 * las tres cosas, y es el error habitual al añadir filtros.
 *
 * Igual que con la paginación, los valores llegan como texto arbitrario
 * del visitante: aquí se normalizan a algo seguro en vez de propagar
 * `NaN` hasta la consulta.
 */

export const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Más recientes' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'valoracion', label: 'Mejor valorados' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as readonly string[];

export interface ProductFilters {
  sort: SortValue;
  /** Precio mínimo, en la unidad principal de la moneda. */
  minPrice?: number;
  maxPrice?: number;
  /** Oculta los productos agotados. */
  inStock: boolean;
  /** Nota mínima (1–5). Descarta los productos sin opiniones. */
  minRating?: number;
}

type Param = string | string[] | undefined;

function primerValor(raw: Param): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Convierte un parámetro en un número positivo, o `undefined`.
 *
 * Cualquier cosa que no sea un número finito y no negativo se descarta en
 * silencio: un filtro con basura debe comportarse como si no estuviera,
 * no romper la página.
 */
function numeroPositivo(raw: Param): number | undefined {
  const valor = primerValor(raw);
  if (valor === undefined || valor === '') return undefined;

  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Lee los filtros de los parámetros de búsqueda de la URL. */
export function parseFilters(searchParams: Record<string, Param>): ProductFilters {
  const sortRaw = primerValor(searchParams.sort);
  const sort = (SORT_VALUES.includes(sortRaw ?? '') ? sortRaw : 'relevancia') as SortValue;

  let minPrice = numeroPositivo(searchParams.min);
  let maxPrice = numeroPositivo(searchParams.max);

  // Un rango invertido (min 500, max 100) no devolvería nada y parecería
  // que no hay productos. Se intercambian, que es casi seguro lo que la
  // persona quiso decir.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const ratingRaw = numeroPositivo(searchParams.rating);
  const minRating =
    ratingRaw && ratingRaw >= 1 && ratingRaw <= 5 ? Math.floor(ratingRaw) : undefined;

  return {
    sort,
    minPrice,
    maxPrice,
    inStock: primerValor(searchParams.stock) === '1',
    minRating,
  };
}

/** ¿Hay algún filtro aplicado? Decide si se muestra «Limpiar filtros». */
export function hasActiveFilters(f: ProductFilters): boolean {
  return (
    f.minPrice !== undefined ||
    f.maxPrice !== undefined ||
    f.inStock ||
    f.minRating !== undefined ||
    f.sort !== 'relevancia'
  );
}

/**
 * Traduce los filtros a la cláusula `where` de Prisma.
 *
 * Solo añade condiciones para los filtros presentes: un `where` con
 * `undefined` en cada campo obligaría a Postgres a evaluar condiciones
 * que siempre se cumplen.
 */
export function toPrismaWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    where.price = {
      ...(f.minPrice !== undefined ? { gte: f.minPrice } : {}),
      ...(f.maxPrice !== undefined ? { lte: f.maxPrice } : {}),
    };
  }

  if (f.inStock) where.stock = { gt: 0 };
  if (f.minRating !== undefined) where.ratingAverage = { gte: f.minRating };

  return where;
}

/**
 * Traduce el ordenamiento a `orderBy`.
 *
 * Todas las opciones llevan un desempate por `createdAt`. Sin él, dos
 * productos del mismo precio pueden salir en distinto orden entre
 * recargas, y al paginar eso hace que una fila aparezca dos veces o
 * ninguna: Postgres no garantiza un orden estable para valores iguales.
 */
export function toPrismaOrderBy(sort: SortValue): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'precio-asc':
      return [{ price: 'asc' }, { createdAt: 'desc' }];
    case 'precio-desc':
      return [{ price: 'desc' }, { createdAt: 'desc' }];
    case 'valoracion':
      // A igualdad de nota, primero el que tiene más opiniones: un 5,0 con
      // cincuenta reseñas informa más que un 5,0 con una.
      return [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }, { createdAt: 'desc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

/**
 * Construye la cadena de consulta conservando los filtros actuales.
 *
 * La usan tanto los controles de filtro como la navegación de páginas:
 * cambiar de página no puede perder el filtro, y cambiar el filtro debe
 * volver a la página 1 —seguir en la página 5 de un resultado que ahora
 * tiene 2 mostraría una lista vacía.
 */
export function buildFilterQuery(
  actuales: Record<string, Param>,
  cambios: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [clave, valor] of Object.entries(actuales)) {
    const v = primerValor(valor);
    if (v) params.set(clave, v);
  }

  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined || valor === '') params.delete(clave);
    else params.set(clave, String(valor));
  }

  // Cualquier cambio de filtro reinicia la paginación.
  if (Object.keys(cambios).some((k) => k !== 'page')) params.delete('page');

  const cadena = params.toString();
  return cadena ? `?${cadena}` : '';
}

/** Claves de filtro que viajan en la URL. `page` va aparte. */
const CLAVES_DE_FILTRO = ['sort', 'min', 'max', 'stock', 'rating'] as const;

/**
 * Extrae los filtros activos de la URL como pares planos.
 *
 * Los necesita `PaginationNav` para arrastrarlos al cambiar de página. Sin
 * esto, pasar a la página 2 de un resultado filtrado devuelve el catálogo
 * entero sin filtrar, que es un fallo desconcertante porque la página 1
 * se ve bien.
 */
export function filtrosEnUrl(searchParams: Record<string, Param>): Record<string, string> {
  const salida: Record<string, string> = {};

  for (const clave of CLAVES_DE_FILTRO) {
    const valor = primerValor(searchParams[clave]);
    if (valor) salida[clave] = valor;
  }

  return salida;
}

/**
 * Cadena de consulta con los filtros quitados, conservando el resto.
 *
 * La usa «Limpiar filtros». Apuntar al `basePath` a secas parecía
 * equivalente y no lo es: en `/buscar` habría borrado también el término
 * buscado, dejando la página de búsqueda vacía. Lo detectó una prueba de
 * extremo a extremo.
 */
export function sinFiltros(searchParams: Record<string, Param>): string {
  const params = new URLSearchParams();

  for (const [clave, valor] of Object.entries(searchParams)) {
    if (CLAVES_DE_FILTRO.includes(clave as (typeof CLAVES_DE_FILTRO)[number])) continue;
    if (clave === 'page') continue;

    const v = primerValor(valor);
    if (v) params.set(clave, v);
  }

  const cadena = params.toString();
  return cadena ? `?${cadena}` : '';
}
