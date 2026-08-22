import { prisma } from '@/lib/prisma';
import { isUniqueViolation } from '@/lib/utils/errors';

/**
 * Favoritos: productos que un cliente guarda para más tarde.
 *
 * Solo para usuarios con sesión. Un favorito anónimo viviría en una cookie
 * y se perdería al cambiar de dispositivo, que es justamente cuando la
 * función sirve —guardar algo en el móvil para comprarlo luego en el
 * ordenador.
 *
 * Deliberadamente mínimo: no hay listas con nombre ni posibilidad de
 * compartirlas. Eso es otra función distinta, y añadirla «por si acaso»
 * sería la clase de complejidad que esta plantilla evita.
 */

/**
 * Añade o quita, devolviendo el estado resultante.
 *
 * Es una sola operación y no dos porque la interfaz es un botón que
 * alterna: dos acciones separadas obligarían al cliente a saber el estado
 * actual antes de decidir cuál llamar, y ese estado puede haber cambiado
 * en otra pestaña.
 *
 * @returns `true` si el producto quedó en favoritos.
 */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  // `deleteMany` en vez de `delete` porque no lanza cuando no hay nada que
  // borrar: aquí la ausencia no es un error, es la mitad del caso de uso.
  const { count } = await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  if (count > 0) return false;

  try {
    await prisma.wishlistItem.create({ data: { userId, productId } });
    return true;
  } catch (err) {
    // Dos pulsaciones rápidas pueden intentar crear la misma entrada a la
    // vez. El índice único lo impide y el resultado —está en favoritos—
    // es el correcto, así que no hay nada que reportar.
    if (isUniqueViolation(err)) return true;
    throw err;
  }
}

/**
 * Favoritos del usuario, con el producto listo para mostrar.
 *
 * Solo devuelve productos activos: uno retirado del catálogo no se puede
 * comprar, y enseñarlo en la lista llevaría a una ficha inexistente.
 */
export async function listWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId, product: { isActive: true } },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: { category: { select: { name: true, slug: true } } } } },
  });
}

/**
 * Los ids que este usuario tiene en favoritos, de entre los indicados.
 *
 * Una sola consulta para toda una grilla, en vez de una por tarjeta.
 * Devuelve un `Set` porque quien lo consume solo pregunta «¿está este?».
 */
export async function getWishlistedIds(userId: string, productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const filas = await prisma.wishlistItem.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });

  return new Set(filas.map((f) => f.productId));
}

/** Cuántos favoritos tiene el usuario. Lo muestra el menú de cuenta. */
export async function countWishlist(userId: string) {
  return prisma.wishlistItem.count({ where: { userId, product: { isActive: true } } });
}
