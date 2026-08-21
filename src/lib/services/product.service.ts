import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';

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

export async function searchProducts(query: string, limit = 24) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { description: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
