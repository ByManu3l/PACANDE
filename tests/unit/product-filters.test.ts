import { describe, expect, it } from 'vitest';

import { getCategoryProducts } from '@/lib/services/category.service';
import { searchProducts } from '@/lib/services/product.service';
import {
  buildFilterQuery,
  filtrosEnUrl,
  hasActiveFilters,
  parseFilters,
  toPrismaOrderBy,
  toPrismaWhere,
} from '@/lib/utils/product-filters';

import { createCategory, createProduct } from './factories';

describe('parseFilters', () => {
  it('sin parámetros devuelve el estado neutro', () => {
    const f = parseFilters({});
    expect(f.sort).toBe('relevancia');
    expect(f.inStock).toBe(false);
    expect(hasActiveFilters(f)).toBe(false);
  });

  it('ignora un orden inventado en vez de romper', () => {
    // El parámetro viene de la URL: puede ser cualquier cosa.
    expect(parseFilters({ sort: 'ordenar-por-color' }).sort).toBe('relevancia');
  });

  it('descarta precios que no son números', () => {
    const f = parseFilters({ min: 'abc', max: '' });
    expect(f.minPrice).toBeUndefined();
    expect(f.maxPrice).toBeUndefined();
  });

  it('descarta precios negativos', () => {
    expect(parseFilters({ min: '-500' }).minPrice).toBeUndefined();
  });

  it('intercambia un rango invertido', () => {
    // min 500 con max 100 no devolvería nada y parecería que no hay
    // productos, cuando lo que pasó es que se escribieron al revés.
    const f = parseFilters({ min: '500', max: '100' });
    expect(f.minPrice).toBe(100);
    expect(f.maxPrice).toBe(500);
  });

  it('acepta valoración solo entre 1 y 5', () => {
    expect(parseFilters({ rating: '4' }).minRating).toBe(4);
    expect(parseFilters({ rating: '9' }).minRating).toBeUndefined();
    expect(parseFilters({ rating: '0' }).minRating).toBeUndefined();
  });

  it('toma el primer valor si el parámetro se repite', () => {
    expect(parseFilters({ sort: ['precio-asc', 'precio-desc'] }).sort).toBe('precio-asc');
  });
});

describe('toPrismaWhere', () => {
  it('no añade condiciones para los filtros ausentes', () => {
    expect(toPrismaWhere(parseFilters({}))).toEqual({});
  });

  it('traduce el rango de precio', () => {
    const where = toPrismaWhere(parseFilters({ min: '100', max: '500' }));
    expect(where.price).toEqual({ gte: 100, lte: 500 });
  });

  it('traduce solo el extremo indicado', () => {
    expect(toPrismaWhere(parseFilters({ min: '100' })).price).toEqual({ gte: 100 });
  });

  it('traduce disponibilidad y valoración', () => {
    const where = toPrismaWhere(parseFilters({ stock: '1', rating: '4' }));
    expect(where.stock).toEqual({ gt: 0 });
    expect(where.ratingAverage).toEqual({ gte: 4 });
  });
});

describe('toPrismaOrderBy', () => {
  it('todo orden lleva un desempate', () => {
    // Sin desempate, dos productos del mismo precio pueden salir en
    // distinto orden entre recargas, y al paginar una fila aparecería dos
    // veces o ninguna.
    for (const sort of ['relevancia', 'precio-asc', 'precio-desc', 'valoracion'] as const) {
      const orden = toPrismaOrderBy(sort);
      expect(orden.length).toBeGreaterThanOrEqual(1);
      expect(orden.at(-1)).toHaveProperty('createdAt');
    }
  });

  it('a igual valoración, primero el que tiene más opiniones', () => {
    expect(toPrismaOrderBy('valoracion')).toEqual([
      { ratingAverage: 'desc' },
      { ratingCount: 'desc' },
      { createdAt: 'desc' },
    ]);
  });
});

describe('buildFilterQuery', () => {
  it('conserva los filtros existentes al cambiar uno', () => {
    const q = buildFilterQuery({ q: 'camiseta', stock: '1' }, { sort: 'precio-asc' });
    expect(q).toContain('q=camiseta');
    expect(q).toContain('stock=1');
    expect(q).toContain('sort=precio-asc');
  });

  it('quita un filtro al pasarle undefined', () => {
    expect(buildFilterQuery({ stock: '1' }, { stock: undefined })).not.toContain('stock');
  });

  it('vuelve a la página 1 al cambiar un filtro', () => {
    // Seguir en la página 5 de un resultado que ahora tiene 2 mostraría
    // una lista vacía.
    const q = buildFilterQuery({ page: '5', q: 'x' }, { sort: 'precio-asc' });
    expect(q).not.toContain('page');
  });

  it('conserva la página al cambiar solo de página', () => {
    expect(buildFilterQuery({ q: 'x' }, { page: 3 })).toContain('page=3');
  });

  it('sin nada devuelve cadena vacía, no un "?" suelto', () => {
    expect(buildFilterQuery({}, {})).toBe('');
  });
});

describe('filtrosEnUrl', () => {
  it('extrae solo las claves de filtro, sin la página', () => {
    // Los necesita la navegación de páginas: sin arrastrarlos, pasar a la
    // página 2 devuelve el catálogo sin filtrar.
    const f = filtrosEnUrl({ q: 'x', sort: 'precio-asc', stock: '1', page: '2', otro: 'z' });
    expect(f).toEqual({ sort: 'precio-asc', stock: '1' });
  });
});

describe('los filtros aplican de verdad contra la base de datos', () => {
  it('el rango de precio estrecha los resultados', async () => {
    const category = await createCategory();
    await createProduct(category.id, { slug: 'barato', price: 10_000 });
    await createProduct(category.id, { slug: 'medio', price: 50_000 });
    await createProduct(category.id, { slug: 'caro', price: 200_000 });

    const todos = await getCategoryProducts(category.id, 1, parseFilters({}));
    expect(todos.total).toBe(3);

    const acotado = await getCategoryProducts(
      category.id,
      1,
      parseFilters({ min: '20000', max: '100000' }),
    );
    expect(acotado.total).toBe(1);
    expect(acotado.items[0].slug).toBe('medio');
  });

  it('«solo disponibles» esconde los agotados', async () => {
    const category = await createCategory();
    await createProduct(category.id, { slug: 'hay', stock: 5 });
    await createProduct(category.id, { slug: 'agotado', stock: 0 });

    const conStock = await getCategoryProducts(category.id, 1, parseFilters({ stock: '1' }));
    expect(conStock.total).toBe(1);
    expect(conStock.items[0].slug).toBe('hay');
  });

  it('el orden por precio invierte el primero', async () => {
    const category = await createCategory();
    await createProduct(category.id, { slug: 'p-barato', price: 1_000 });
    await createProduct(category.id, { slug: 'p-caro', price: 900_000 });

    const asc = await getCategoryProducts(category.id, 1, parseFilters({ sort: 'precio-asc' }));
    const desc = await getCategoryProducts(category.id, 1, parseFilters({ sort: 'precio-desc' }));

    expect(asc.items[0].slug).toBe('p-barato');
    expect(desc.items[0].slug).toBe('p-caro');
  });

  it('la búsqueda respeta los filtros además del término', async () => {
    const category = await createCategory();
    await createProduct(category.id, { slug: 'gorra-azul', name: 'Gorra Azul', price: 20_000 });
    await createProduct(category.id, { slug: 'gorra-roja', name: 'Gorra Roja', price: 300_000 });

    const todas = await searchProducts('gorra', 1, parseFilters({}));
    expect(todas.total).toBe(2);

    const baratas = await searchProducts('gorra', 1, parseFilters({ max: '50000' }));
    expect(baratas.total).toBe(1);
    expect(baratas.items[0].slug).toBe('gorra-azul');
  });
});
