'use server';

import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { isUserUpload, storage } from '@/lib/services/storage.service';
import { runAction } from '@/lib/utils/action-result';
import { ConflictError } from '@/lib/utils/errors';
import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  type ProductInput,
  productSchema,
} from '@/lib/validations/product';

export async function listProductsAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });
  // Called directly from ProductsTable (a Client Component), not just from
  // the admin page's Server Component — Prisma's Decimal isn't serializable
  // across that boundary (same issue fixed for the cart in cart.actions.ts).
  return products.map((p) => ({ ...p, price: p.price.toString() }));
}

/** Uploads product images ahead of create/update, returning their public
 * paths — kept separate from createProductAction/updateProductAction so
 * those two stay plain JSON-serializable calls, not FormData. */
export async function uploadProductImagesAction(formData: FormData) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);

    const files = formData.getAll('images').filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      throw new Error('Selecciona al menos una imagen.');
    }

    const paths: string[] = [];
    for (const file of files) {
      if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type)) {
        throw new Error(`Formato no soportado: ${file.name}`);
      }
      if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
        throw new Error(`"${file.name}" supera 5MB.`);
      }
      const filename = `${randomUUID()}${extname(file.name) || '.jpg'}`;
      paths.push(await storage.save(file, 'uploads/products', filename));
    }

    return paths;
  });
}

export async function createProductAction(input: ProductInput & { images: string[] }) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    const { images, ...rest } = input;
    const parsed = productSchema.parse(rest);
    if (images.length === 0) {
      throw new Error('El producto necesita al menos una imagen.');
    }

    const existing = await prisma.product.findUnique({ where: { slug: parsed.slug } });
    if (existing) throw new ConflictError('Ya existe un producto con ese slug.');

    await prisma.product.create({ data: { ...parsed, images } });
    revalidatePath('/admin/productos');
    revalidatePath('/categoria', 'layout');
  });
}

export async function updateProductAction(id: string, input: ProductInput & { images: string[] }) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    const { images, ...rest } = input;
    const parsed = productSchema.parse(rest);
    if (images.length === 0) {
      throw new Error('El producto necesita al menos una imagen.');
    }

    const existing = await prisma.product.findUnique({ where: { slug: parsed.slug } });
    if (existing && existing.id !== id) {
      throw new ConflictError('Ya existe un producto con ese slug.');
    }

    const current = await prisma.product.findUniqueOrThrow({
      where: { id },
      select: { images: true },
    });

    await prisma.product.update({ where: { id }, data: { ...parsed, images } });

    // Las imágenes que el admin quitó del producto ya no las referencia
    // nadie. Sin este barrido, cada edición deja archivos muertos en disco.
    await deleteOrphanedUploads(current.images.filter((img) => !images.includes(img)));

    revalidatePath('/admin/productos');
    revalidatePath('/categoria', 'layout');
    revalidatePath('/producto', 'layout');
  });
}

export async function deleteProductAction(id: string) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);

    // OrderItem.productId es onDelete: SetNull (el pedido conserva su
    // instantánea de nombre/precio) y CartItem.productId es onDelete:
    // Cascade — borrar un producto es seguro por diseño del schema.
    const deleted = await prisma.product.delete({ where: { id }, select: { images: true } });
    await deleteOrphanedUploads(deleted.images);

    revalidatePath('/admin/productos');
    revalidatePath('/categoria', 'layout');
  });
}

/** Borra del almacenamiento las rutas que sean subidas de usuario. Las
 * imágenes del catálogo semilla (`/images/...`) se ignoran: están
 * versionadas y las comparten varios productos de ejemplo. */
async function deleteOrphanedUploads(paths: string[]) {
  await Promise.all(paths.filter(isUserUpload).map((path) => storage.delete(path)));
}
