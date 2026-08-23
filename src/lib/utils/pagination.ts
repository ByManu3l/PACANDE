/** Productos por página en las grillas del storefront. */
export const PAGE_SIZE = 24;

/**
 * Filas por página en las tablas del panel.
 *
 * Más que en el escaparate: administrar es escanear listas, y una tabla
 * de 24 filas obliga a paginar constantemente. Menos que unos cientos,
 * porque cada fila trae relaciones (líneas de pedido, envío, usuario) y
 * el coste crece rápido.
 */
export const ADMIN_PAGE_SIZE = 50;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Normaliza el parámetro `?page=` de la URL.
 *
 * Llega como texto arbitrario del visitante, así que puede ser `abc`, `-3`
 * o `99999999`. Cualquier cosa que no sea un entero ≥ 1 se trata como la
 * página 1 en vez de propagar un `NaN` hasta el `skip` de la consulta.
 */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

/** Convierte un número de página en el `skip`/`take` que espera Prisma. */
export function toSkipTake(page: number, pageSize = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPage<T>(
  items: T[],
  total: number,
  page: number,
  pageSize = PAGE_SIZE,
): Page<T> {
  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
