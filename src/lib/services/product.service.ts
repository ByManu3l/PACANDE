import { prisma } from '@/lib/prisma';
import { ConflictError, isUniqueViolation, NotFoundError } from '@/lib/utils/errors';
import { buildPage, PAGE_SIZE, toSkipTake } from '@/lib/utils/pagination';
import type { ProductInput } from '@/lib/validations/product';

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
    // La categoría madre hace falta para las migas de pan: sin ella la
    // ruta sería "Inicio › Celulares" y se perdería el nivel intermedio.
    include: { category: { include: { parent: true } } },
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

// ---------------------------------------------------------------------------
// Panel de administración
//
// A diferencia de las consultas de arriba, estas no filtran por `isActive`:
// el panel gestiona el inventario completo, no solo lo publicado.
// ---------------------------------------------------------------------------

/** Catálogo completo para la tabla del panel, con su categoría. */
export async function listProductsForAdmin() {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });
}

/**
 * Crea un producto.
 *
 * El slug duplicado se detecta por el índice único y no con una consulta
 * previa: ver la explicación en `isUniqueViolation`.
 */
export async function createProduct(input: ProductInput, images: string[]) {
  try {
    return await prisma.product.create({ data: { ...input, images } });
  } catch (err) {
    if (isUniqueViolation(err, 'slug')) {
      throw new ConflictError('Ya existe un producto con ese slug.');
    }
    throw err;
  }
}

/**
 * Actualiza un producto y devuelve las imágenes que dejó de usar.
 *
 * Devolver los huérfanos en vez de borrarlos aquí mantiene al servicio
 * fuera del sistema de archivos: quien decide qué hacer con esas rutas es
 * la Server Action, que es la que conoce el almacenamiento. Así este
 * módulo sigue siendo comprobable contra la base de datos sin tocar disco.
 *
 * La lectura previa y la escritura van en una transacción para que la
 * lista de huérfanos corresponda exactamente al estado que se reemplazó,
 * y no a uno intermedio de otra edición simultánea.
 */
export async function updateProduct(id: string, input: ProductInput, images: string[]) {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUniqueOrThrow({
        where: { id },
        select: { images: true },
      });

      await tx.product.update({ where: { id }, data: { ...input, images } });

      return { orphanedImages: current.images.filter((img) => !images.includes(img)) };
    });
  } catch (err) {
    if (isUniqueViolation(err, 'slug')) {
      throw new ConflictError('Ya existe un producto con ese slug.');
    }
    throw err;
  }
}

/**
 * Elimina un producto y devuelve sus imágenes para que la acción las
 * limpie del almacenamiento.
 *
 * Borrar es seguro por diseño del schema: `OrderItem.productId` es
 * `SetNull` (el pedido conserva su instantánea de nombre y precio) y
 * `CartItem.productId` es `Cascade` (desaparece de los carritos).
 */
export async function deleteProduct(id: string) {
  const deleted = await prisma.product.delete({ where: { id }, select: { images: true } });
  return { orphanedImages: deleted.images };
}

/** Slugs de los productos visibles, para `app/sitemap.ts`. */
export async function listActiveProductSlugs() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });
}

/**
 * Otros productos de la misma categoría, excluyendo el actual.
 *
 * Es la recomendación más simple que funciona: quien mira un celular
 * suele estar comparando celulares. No hay historial de navegación ni
 * modelo de similitud detrás, y no hace falta — un motor de
 * recomendaciones es un producto en sí mismo, no una función de plantilla.
 *
 * Se ordena por valoración y no al azar: si hay que sugerir cuatro
 * productos, que sean los mejor valorados.
 */
export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 4) {
  return prisma.product.findMany({
    where: { categoryId, isActive: true, id: { not: excludeId }, stock: { gt: 0 } },
    orderBy: [{ ratingAverage: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}
