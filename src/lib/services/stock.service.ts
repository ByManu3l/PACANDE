import { prisma } from '@/lib/prisma';
import {
  compararUrgencia,
  DIAS_DE_VENTAS,
  evaluarStock,
  PRODUCTOS_MINIMOS_POR_SECCION,
} from '@/lib/utils/stock';

/**
 * Alertas del «stock inteligente» para el panel de administración:
 *
 * - **Productos por reponer:** agotados o con pocas unidades para su ritmo
 *   de venta de los últimos 30 días, con las unidades que conviene pedir.
 * - **Secciones con poco surtido:** categorías hoja (las que muestran
 *   productos) con menos de tres productos disponibles. Una sección así se
 *   ve vacía al cliente aunque ningún producto concreto esté agotado.
 *
 * Solo cuentan los productos y categorías activos: lo inactivo no está a la
 * venta y no tiene sentido pedir que se reponga. Las ventas son las de
 * pedidos pagados o completados; un pedido pendiente o cancelado no dice
 * nada del ritmo real.
 */
export async function getStockAlerts() {
  const desde = new Date(Date.now() - DIAS_DE_VENTAS * 24 * 60 * 60 * 1000);

  const [productos, ventas, secciones] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        category: { select: { name: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        order: { status: { in: ['PAID', 'COMPLETED'] }, createdAt: { gte: desde } },
      },
      _sum: { quantity: true },
    }),
    prisma.category.findMany({
      where: { isActive: true, children: { none: {} } },
      select: {
        name: true,
        slug: true,
        parent: { select: { name: true } },
        products: { where: { isActive: true }, select: { stock: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const vendidas = new Map(ventas.map((v) => [v.productId, v._sum.quantity ?? 0]));

  const porReponer = productos
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.stock,
      categoria: p.category.name,
      vendidas: vendidas.get(p.id) ?? 0,
      ...evaluarStock(p.stock, vendidas.get(p.id) ?? 0),
    }))
    .filter((p) => p.nivel !== 'ok')
    .sort(compararUrgencia);

  const seccionesConPocoSurtido = secciones
    .map((s) => ({
      name: s.parent ? `${s.parent.name} · ${s.name}` : s.name,
      slug: s.slug,
      disponibles: s.products.filter((p) => p.stock > 0).length,
      total: s.products.length,
    }))
    .filter((s) => s.disponibles < PRODUCTOS_MINIMOS_POR_SECCION)
    .sort((a, b) => a.disponibles - b.disponibles);

  return { porReponer, seccionesConPocoSurtido };
}
