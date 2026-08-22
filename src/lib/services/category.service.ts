import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';
import { buildPage, PAGE_SIZE, toSkipTake } from '@/lib/utils/pagination';

export async function getTopLevelCategories() {
  return prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Devuelve la categoría con sus subcategorías, **sin** los productos.
 *
 * Una categoría con hijos renderiza una grilla de subcategorías; una hoja
 * renderiza productos. Los productos se piden aparte y paginados (ver
 * `getCategoryProducts`): incluirlos aquí traería el catálogo completo de
 * la categoría en cada visita, incluso cuando la página no va a mostrar
 * ninguno porque la categoría tiene hijos.
 */
export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      parent: true,
      children: { where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] },
    },
  });

  if (!category) {
    throw new NotFoundError(`Categoría "${slug}" no encontrada.`);
  }

  return category;
}

/**
 * Productos activos de una categoría, paginados en la base de datos.
 *
 * El total se consulta con un `count` en paralelo en vez de contar el
 * arreglo devuelto: el arreglo solo tiene la página actual, así que
 * contarlo daría siempre `PAGE_SIZE` como máximo y la navegación entre
 * páginas nunca sabría cuántas hay.
 */
export async function getCategoryProducts(categoryId: string, page: number) {
  const where = { categoryId, isActive: true };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(page),
    }),
    prisma.product.count({ where }),
  ]);

  return buildPage(items, total, page, PAGE_SIZE);
}

export async function listCategoriesForNav() {
  return prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: {
      children: { where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] },
    },
  });
}
