import { describe, expect, it } from 'vitest';

import { getCategoryProducts } from '@/lib/services/category.service';
import { searchProducts } from '@/lib/services/product.service';
import { buildPage, PAGE_SIZE, parsePageParam, toSkipTake } from '@/lib/utils/pagination';

import { createCategory, createProduct } from './factories';

describe('parsePageParam', () => {
  it('acepta enteros válidos', () => {
    expect(parsePageParam('1')).toBe(1);
    expect(parsePageParam('7')).toBe(7);
  });

  it('cae a la página 1 ante cualquier basura', () => {
    // El parámetro viene de la URL, así que puede ser cualquier cosa.
    // Sin normalizar, un `NaN` llegaría hasta el `skip` de la consulta.
    for (const raw of ['abc', '0', '-3', '1.5', '', undefined, 'null']) {
      expect(parsePageParam(raw)).toBe(1);
    }
  });

  it('toma el primer valor cuando el parámetro se repite en la URL', () => {
    expect(parsePageParam(['3', '9'])).toBe(3);
  });
});

describe('toSkipTake / buildPage', () => {
  it('la primera página no salta filas', () => {
    expect(toSkipTake(1)).toEqual({ skip: 0, take: PAGE_SIZE });
  });

  it('salta un tamaño de página por cada página previa', () => {
    expect(toSkipTake(3)).toEqual({ skip: PAGE_SIZE * 2, take: PAGE_SIZE });
  });

  it('siempre reporta al menos una página, incluso sin resultados', () => {
    // Con 0 resultados, `Math.ceil(0 / n)` es 0 y la UI mostraría
    // "Página 1 de 0", que no significa nada.
    expect(buildPage([], 0, 1).pageCount).toBe(1);
  });

  it('redondea hacia arriba la última página incompleta', () => {
    expect(buildPage([], PAGE_SIZE + 1, 1).pageCount).toBe(2);
  });
});

describe('paginación contra la base de datos', () => {
  it('devuelve solo la página pedida pero informa el total completo', async () => {
    const category = await createCategory();
    const total = PAGE_SIZE + 5;
    for (let i = 0; i < total; i++) {
      await createProduct(category.id, { slug: `paginado-${i}`, name: `Producto ${i}` });
    }

    const first = await getCategoryProducts(category.id, 1);
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.total).toBe(total);
    expect(first.pageCount).toBe(2);

    const second = await getCategoryProducts(category.id, 2);
    expect(second.items).toHaveLength(5);

    // Ninguna fila aparece en ambas páginas.
    const ids = new Set([...first.items, ...second.items].map((p) => p.id));
    expect(ids.size).toBe(total);
  });

  it('no devuelve nada para una búsqueda vacía, sin consultar la base', async () => {
    const result = await searchProducts('   ', 1);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('la búsqueda ignora mayúsculas y acepta coincidencias parciales', async () => {
    const category = await createCategory();
    await createProduct(category.id, { slug: 'buscable', name: 'Camiseta Roja Especial' });

    const result = await searchProducts('camiseta roja', 1);
    expect(result.total).toBe(1);
  });
});
