import { Prisma, type ReviewStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ConflictError, isUniqueViolation, ValidationError } from '@/lib/utils/errors';
import { buildPage, toSkipTake } from '@/lib/utils/pagination';

/**
 * Opiniones de clientes sobre productos.
 *
 * Tres reglas sostienen que las valoraciones signifiquen algo:
 *
 * 1. **Solo opina quien compró.** Sin esta comprobación, la sección de
 *    reseñas es un formulario público y la valoración media deja de
 *    informar sobre el producto.
 * 2. **Una opinión por persona y producto**, garantizado por un índice
 *    único. Si no, veinte reseñas propias inflan cualquier producto.
 * 3. **Todo pasa por moderación.** Ninguna opinión se publica sola.
 *
 * La media y el número de reseñas viven desnormalizados en `Product`
 * porque las tarjetas del escaparate los muestran en todas las grillas.
 * Cada cambio de estado los recalcula **dentro de la misma transacción**,
 * de modo que no puedan quedar desincronizados.
 */

/** Reseñas por página en la ficha de producto. */
export const REVIEWS_PAGE_SIZE = 10;

/**
 * Recalcula media y recuento de un producto a partir de sus reseñas
 * aprobadas.
 *
 * Recibe el cliente de transacción y no usa `prisma` directamente: tiene
 * que ejecutarse dentro de la misma transacción que el cambio que lo
 * provoca. Llamarlo por fuera dejaría una ventana en la que la ficha
 * muestra una media que ya no corresponde a las reseñas visibles.
 *
 * Se recalcula desde cero en lugar de ajustar el promedio de forma
 * incremental: es una sola consulta agregada sobre las reseñas de un
 * producto —decenas de filas, no millones— y a cambio el valor es siempre
 * exacto en vez de acumular desviaciones con cada operación.
 */
async function recalcularValoracion(tx: Prisma.TransactionClient, productId: string) {
  const agregado = await tx.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: true,
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      ratingAverage: new Prisma.Decimal(agregado._avg.rating ?? 0).toDecimalPlaces(2),
      ratingCount: agregado._count,
    },
  });
}

/**
 * ¿Este usuario compró este producto?
 *
 * Se busca en las líneas de pedido y no en el carrito, y solo en pedidos
 * pagados o completados: un pedido rechazado o pendiente de pago no
 * acredita nada.
 */
export async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const linea = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: ['PAID', 'COMPLETED'] } },
    },
    select: { id: true },
  });

  return linea !== null;
}

/**
 * Publica una opinión, que queda pendiente de moderación.
 *
 * @throws {ValidationError} si quien opina no compró el producto.
 * @throws {ConflictError} si ya opinó sobre él.
 */
export async function createReview(input: {
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  body: string;
}) {
  if (!(await hasPurchased(input.userId, input.productId))) {
    throw new ValidationError('Solo puedes opinar sobre productos que hayas comprado.');
  }

  try {
    return await prisma.review.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        rating: input.rating,
        title: input.title || null,
        body: input.body,
        // El estado inicial es PENDING por defecto en el schema. No se
        // recalcula la valoración aquí: una reseña sin aprobar no cuenta.
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError('Ya publicaste una opinión sobre este producto.');
    }
    throw err;
  }
}

/**
 * Opiniones **aprobadas** de un producto, paginadas.
 *
 * Del autor se traen solo nombre e imagen: es lo que se muestra, y evita
 * arrastrar su correo —o el hash de su contraseña— hasta una página
 * pública.
 */
export async function getProductReviews(productId: string, page: number) {
  const where = { productId, status: 'APPROVED' as const };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, image: true } } },
      ...toSkipTake(page, REVIEWS_PAGE_SIZE),
    }),
    prisma.review.count({ where }),
  ]);

  return buildPage(items, total, page, REVIEWS_PAGE_SIZE);
}

/**
 * Reparto de estrellas de un producto: cuántas reseñas hay de cada nota.
 *
 * Es lo que dibuja el desglose «5★ ▓▓▓▓ 12». Una media de 4,2 sin este
 * reparto oculta si viene de opiniones consistentes o de una mezcla de
 * cincos y unos, que es información distinta para quien compra.
 */
export async function getRatingBreakdown(productId: string) {
  const filas = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId, status: 'APPROVED' },
    _count: true,
  });

  // Se completan las notas sin reseñas: la interfaz dibuja las cinco
  // barras siempre, y un hueco desordenaría el desglose.
  const conteo: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const fila of filas) conteo[fila.rating] = fila._count;

  return conteo;
}

/** La opinión de este usuario sobre este producto, si existe. */
export async function getUserReview(userId: string, productId: string) {
  return prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
  });
}

/**
 * Cola de moderación del panel.
 *
 * Por defecto muestra las pendientes, que es la tarea real; el filtro
 * permite revisar también las ya resueltas.
 */
export async function listReviewsForAdmin(status?: ReviewStatus) {
  return prisma.review.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
  });
}

/**
 * Aprueba o rechaza una opinión y recalcula la valoración del producto.
 *
 * Ambas cosas en una transacción: si el recálculo fallara por separado, la
 * ficha mostraría una media que no corresponde a las reseñas visibles, y
 * nada volvería a corregirla.
 */
export async function moderateReview(
  reviewId: string,
  status: ReviewStatus,
  moderationNote?: string,
) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: { id: reviewId },
      data: { status, moderationNote: moderationNote || null },
    });

    await recalcularValoracion(tx, review.productId);
    return review;
  });
}

/** Elimina una opinión y recalcula la valoración del producto. */
export async function deleteReview(reviewId: string) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.delete({ where: { id: reviewId } });
    await recalcularValoracion(tx, review.productId);
  });
}

/** Cuántas opiniones esperan moderación. Lo muestra el panel como aviso. */
export async function countPendingReviews() {
  return prisma.review.count({ where: { status: 'PENDING' } });
}
