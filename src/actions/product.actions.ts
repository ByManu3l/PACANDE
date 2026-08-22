'use server';

import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/guards';
import * as productService from '@/lib/services/product.service';
import { isUserUpload, storage } from '@/lib/services/storage.service';
import { runAction } from '@/lib/utils/action-result';
import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  type ProductInput,
  productSchema,
} from '@/lib/validations/product';

/**
 * Gestión del catálogo desde el panel.
 *
 * Sigue la misma secuencia descrita en `category.actions.ts`, y añade una
 * responsabilidad propia: mantener el almacenamiento de imágenes en
 * sincronía con la base de datos. Los servicios devuelven qué archivos
 * quedaron huérfanos y aquí se borran — así la lógica de datos se puede
 * probar sin tocar el disco.
 */

/** Lectura para la tabla del panel. Ver la nota en `listCategoriesAction`. */
export async function listProductsAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  const products = await productService.listProductsForAdmin();

  // `price` es un `Decimal` de Prisma, que no es serializable al cruzar de
  // Server Action a Client Component (la tabla del panel es cliente y
  // vuelve a llamar a esta acción tras cada cambio). Se envía como texto y
  // se formatea con `formatPrice`, que ya acepta cadenas.
  return products.map((p) => ({ ...p, price: p.price.toString() }));
}

/**
 * Sube las imágenes y devuelve sus rutas públicas.
 *
 * Va aparte de crear/actualizar porque los archivos obligan a usar
 * `FormData`, mientras que las otras dos acciones reciben un objeto JSON
 * normal. Separarlas evita que todo el formulario tenga que serializarse
 * como `FormData` solo por las imágenes.
 *
 * Consecuencia a tener en cuenta: si la subida funciona y después falla el
 * guardado, los archivos quedan en disco sin producto que los referencie.
 * Es un caso poco frecuente y sin impacto para el usuario; limpiarlo
 * exigiría subidas transaccionales, que no compensan aquí.
 */
export async function uploadProductImagesAction(formData: FormData) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);

    const files = formData.getAll('images').filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      throw new Error('Selecciona al menos una imagen.');
    }

    const paths: string[] = [];
    for (const file of files) {
      // El tipo y el tamaño se revalidan aquí aunque el navegador ya los
      // filtre: `formData` puede venir de cualquier cliente.
      if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type)) {
        throw new Error(`Formato no soportado: ${file.name}`);
      }
      if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
        throw new Error(`"${file.name}" supera 5MB.`);
      }
      // Nombre aleatorio: el original puede traer rutas, tildes o repetirse
      // y sobrescribir la imagen de otro producto.
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

    // Fuera del esquema zod porque `images` no viene del formulario sino
    // de `uploadProductImagesAction`, que corre antes.
    if (images.length === 0) {
      throw new Error('El producto necesita al menos una imagen.');
    }

    await productService.createProduct(parsed, images);
    revalidateProductPages();
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

    const { orphanedImages } = await productService.updateProduct(id, parsed, images);
    await deleteOrphanedUploads(orphanedImages);

    revalidateProductPages();
    revalidatePath('/producto', 'layout');
  });
}

export async function deleteProductAction(id: string) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);

    const { orphanedImages } = await productService.deleteProduct(id);
    await deleteOrphanedUploads(orphanedImages);

    revalidateProductPages();
  });
}

/**
 * Borra del almacenamiento las rutas que sean subidas de usuario.
 *
 * El filtro `isUserUpload` es imprescindible: las imágenes del catálogo de
 * ejemplo viven en `/images/...`, están versionadas en el repositorio y
 * varios productos semilla comparten la misma. Borrar una dejaría rotos
 * los demás y no se podría recuperar sin volver a clonar.
 */
async function deleteOrphanedUploads(paths: string[]) {
  await Promise.all(paths.filter(isUserUpload).map((path) => storage.delete(path)));
}

function revalidateProductPages() {
  revalidatePath('/admin/productos');
  revalidatePath('/categoria', 'layout');
}
