import { prisma } from '@/lib/prisma';

/**
 * Contadores de la portada del panel de administración.
 *
 * Los cinco `count` van en un `Promise.all` para que Postgres los resuelva
 * en paralelo en vez de encadenar cinco viajes de ida y vuelta.
 *
 * Son totales sin filtrar (incluyen productos y categorías inactivos): el
 * panel muestra el inventario completo, no el escaparate.
 */
export async function getDashboardStats() {
  const [products, categories, orders, users, pendingShipments] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.shipment.count({ where: { status: 'PENDING' } }),
  ]);
  return { products, categories, orders, users, pendingShipments };
}
