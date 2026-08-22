import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';
import { buildPage, PAGE_SIZE, toSkipTake } from '@/lib/utils/pagination';

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: { category: true },
  });

  if (!product) {
    throw new NotFoundError(`Producto "${slug}" no encontrado.`);
  }

  return product;
}

/**
 * Búsqueda por nombre y descripción, paginada.
 *
 * Usa `contains` (un `ILIKE '%…%'` en Postgres), que no puede aprovechar
 * un índice B-tree y hace un recorrido secuencial de la tabla. Es
 * suficiente para un catálogo de unos pocos miles de productos y no añade
 * dependencias. Cuando deje de serlo, la evolución natural es la búsqueda
 * de texto completo nativa de Postgres (`tsvector` + índice GIN) antes que
 * incorporar un motor externo tipo Elasticsearch o Algolia.
 */
export async function searchProducts(query: string, page: number) {
  const trimmed = query.trim();
  if (!trimmed)
    return buildPage<Awaited<ReturnType<typeof prisma.product.findMany>>[number]>([], 0, 1);

  const where = {
    isActive: true,
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' as const } },
      { description: { contains: trimmed, mode: 'insensitive' as const } },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(page) }),
    prisma.product.count({ where }),
  ]);

  return buildPage(items, total, page, PAGE_SIZE);
}
