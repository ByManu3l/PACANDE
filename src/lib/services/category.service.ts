import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/utils/errors';

export async function getTopLevelCategories() {
  return prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
}

/**
 * A category page renders one of two ways: a grid of subcategories (when
 * the category has children) or a grid of products (when it's a leaf) —
 * this returns everything the page needs to decide which.
 */
export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      parent: true,
      children: { where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] },
      products: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!category) {
    throw new NotFoundError(`Categoría "${slug}" no encontrada.`);
  }

  return category;
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
