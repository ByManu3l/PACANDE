import { prisma } from '@/lib/prisma';

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
