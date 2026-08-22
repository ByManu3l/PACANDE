'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { runAction } from '@/lib/utils/action-result';
import { ConflictError, ValidationError } from '@/lib/utils/errors';
import { type CategoryInput, categorySchema } from '@/lib/validations/category';

export async function listCategoriesAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  return prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    include: { parent: true, _count: { select: { products: true, children: true } } },
  });
}

export async function createCategoryAction(input: CategoryInput) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    const parsed = categorySchema.parse(input);

    const existing = await prisma.category.findUnique({ where: { slug: parsed.slug } });
    if (existing) throw new ConflictError('Ya existe una categoría con ese slug.');

    await prisma.category.create({
      data: { ...parsed, parentId: parsed.parentId || null },
    });
    revalidatePath('/admin/categorias');
    revalidatePath('/categoria', 'layout');
  });
}

export async function updateCategoryAction(id: string, input: CategoryInput) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    const parsed = categorySchema.parse(input);

    if (parsed.parentId === id) {
      throw new ValidationError('Una categoría no puede ser su propio padre.');
    }

    const existing = await prisma.category.findUnique({ where: { slug: parsed.slug } });
    if (existing && existing.id !== id) {
      throw new ConflictError('Ya existe una categoría con ese slug.');
    }

    await prisma.category.update({
      where: { id },
      data: { ...parsed, parentId: parsed.parentId || null },
    });
    revalidatePath('/admin/categorias');
    revalidatePath('/categoria', 'layout');
  });
}

export async function deleteCategoryAction(id: string) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);

    const [productCount, childCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);
    if (productCount > 0) {
      throw new ValidationError(
        `No se puede eliminar: tiene ${productCount} producto(s). Muévelos o elimínalos primero.`,
      );
    }
    if (childCount > 0) {
      throw new ValidationError(
        `No se puede eliminar: tiene ${childCount} subcategoría(s). Elimínalas primero.`,
      );
    }

    await prisma.category.delete({ where: { id } });
    revalidatePath('/admin/categorias');
    revalidatePath('/categoria', 'layout');
  });
}
