import { prisma } from '@/lib/prisma';
import {
  ConflictError,
  isUniqueViolation,
  NotFoundError,
  ValidationError,
} from '@/lib/utils/errors';
import { buildPage, PAGE_SIZE, toSkipTake } from '@/lib/utils/pagination';
import type { CategoryInput } from '@/lib/validations/category';

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

// ---------------------------------------------------------------------------
// Panel de administración
//
// Lo de arriba alimenta el escaparate y filtra por `isActive`. Lo de abajo
// alimenta el panel, que ve el árbol completo — incluidas las categorías
// ocultas, que precisamente hay que poder encontrar para reactivarlas.
// ---------------------------------------------------------------------------

/**
 * Árbol completo para la tabla del panel, con el recuento de lo que
 * cuelga de cada categoría.
 *
 * El `_count` se usa para explicar por qué una categoría no se puede
 * borrar todavía, sin tener que consultarlo fila por fila.
 */
export async function listCategoriesForAdmin() {
  return prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    include: { parent: true, _count: { select: { products: true, children: true } } },
  });
}

export async function createCategory(input: CategoryInput) {
  try {
    return await prisma.category.create({
      // Un `parentId` vacío es lo que envía el `<select>` cuando se elige
      // "sin categoría madre"; en base de datos eso es NULL, no "".
      data: { ...input, parentId: input.parentId || null },
    });
  } catch (err) {
    if (isUniqueViolation(err, 'slug')) {
      throw new ConflictError('Ya existe una categoría con ese slug.');
    }
    throw err;
  }
}

/**
 * Actualiza una categoría, impidiendo que el árbol quede inconsistente.
 *
 * Se rechazan dos movimientos:
 *
 * 1. Que una categoría sea su propia madre.
 * 2. Que se cuelgue de una de sus propias descendientes. Esto crearía un
 *    ciclo (A → B → A) y esas categorías desaparecerían del menú: al
 *    recorrer el árbol desde las raíces nunca se llegaría a ellas, porque
 *    el ciclo no tiene raíz. Postgres no impide esto por sí solo —
 *    referenciar una fila existente es válido para él—, así que se
 *    comprueba aquí recorriendo la cadena de madres hacia arriba.
 */
export async function updateCategory(id: string, input: CategoryInput) {
  const parentId = input.parentId || null;

  if (parentId === id) {
    throw new ValidationError('Una categoría no puede ser su propia madre.');
  }
  if (parentId && (await isDescendantOf(parentId, id))) {
    throw new ValidationError(
      'No puedes mover una categoría dentro de una de sus propias subcategorías.',
    );
  }

  try {
    return await prisma.category.update({ where: { id }, data: { ...input, parentId } });
  } catch (err) {
    if (isUniqueViolation(err, 'slug')) {
      throw new ConflictError('Ya existe una categoría con ese slug.');
    }
    throw err;
  }
}

/**
 * ¿`candidateId` está en algún punto por debajo de `ancestorId`?
 *
 * Sube por la cadena de madres desde el candidato. El contador de vueltas
 * es una red de seguridad: si por un fallo anterior ya existiera un ciclo
 * en la base de datos, este bucle no terminaría nunca.
 */
async function isDescendantOf(candidateId: string, ancestorId: string): Promise<boolean> {
  let currentId: string | null = candidateId;

  for (let depth = 0; currentId !== null && depth < MAX_CATEGORY_DEPTH; depth++) {
    if (currentId === ancestorId) return true;

    const current: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }

  return false;
}

/** Tope de seguridad al recorrer el árbol. La plantilla usa 2 niveles. */
const MAX_CATEGORY_DEPTH = 50;

/**
 * Elimina una categoría vacía.
 *
 * Las comprobaciones y el borrado van **dentro de una transacción**: si se
 * contara fuera, otra persona podría crear un producto en esa categoría
 * justo entre el recuento y el `delete`. Aquí ese caso ya no depende de la
 * suerte — o bien la transacción ve el producto y rechaza el borrado, o
 * bien la clave foránea `Restrict` de `Product.categoryId` la aborta.
 *
 * No se borra en cascada a propósito: perder productos o subcategorías
 * enteras por un clic no debe ser posible. El administrador decide qué
 * hacer con ellos primero.
 */
export async function deleteCategory(id: string) {
  return prisma.$transaction(async (tx) => {
    const [productCount, childCount] = await Promise.all([
      tx.product.count({ where: { categoryId: id } }),
      tx.category.count({ where: { parentId: id } }),
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

    await tx.category.delete({ where: { id } });
  });
}

/** Slugs de las categorías visibles, para `app/sitemap.ts`. */
export async function listActiveCategorySlugs() {
  return prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });
}
