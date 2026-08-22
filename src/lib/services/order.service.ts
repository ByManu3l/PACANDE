import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/config/site.config';
import * as cartService from '@/lib/services/cart.service';
import { paymentProvider } from '@/lib/services/payment.service';
import { UnauthorizedError, ValidationError } from '@/lib/utils/errors';

export interface CheckoutInput {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  paymentMethod: 'tarjeta_simulada' | 'contra_entrega';
}

/** Día actual en UTC como AAAAMMDD. Se usa UTC a propósito: con la hora
 * local del servidor, un cambio de zona horaria o un despliegue en otra
 * región movería el corte del día y podría repetir consecutivos. */
function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Reserva el siguiente consecutivo del día en una sola sentencia atómica.
 *
 * La alternativa obvia — contar los pedidos de hoy y sumar uno — falla de
 * dos maneras: la consulta se vuelve más lenta conforme crece la tienda, y
 * dos checkouts simultáneos leen el mismo total, generan el mismo número y
 * chocan contra el índice único de `Order.orderNumber`.
 *
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` deja que Postgres
 * resuelva la contención por fila: cada llamada recibe un valor distinto
 * sin lecturas previas que puedan solaparse.
 *
 * **Compromiso asumido:** al ejecutarse dentro de la transacción del
 * pedido, la fila del día queda bloqueada hasta que esa transacción
 * termina, así que los checkouts simultáneos se serializan en este punto.
 * Es el precio de tener consecutivos legibles y sin huecos, y es
 * despreciable frente a lo que tarda el resto del checkout. Si alguna vez
 * estorba, la salida es renunciar al consecutivo por día y usar un id
 * opaco (ULID) como número de pedido.
 */
async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const day = utcDayKey();

  const [{ value }] = await tx.$queryRaw<Array<{ value: number }>>`
    INSERT INTO "OrderCounter" ("day", "value") VALUES (${day}, 1)
    ON CONFLICT ("day") DO UPDATE SET "value" = "OrderCounter"."value" + 1
    RETURNING "value"
  `;

  return `PCD-${day}-${String(value).padStart(4, '0')}`;
}

/**
 * Reserves stock and creates the order in PENDING_PAYMENT — this is the
 * only place order totals are computed, and it always reads Product.price
 * fresh from the database inside the transaction. The client never sends
 * a price; it only sends productId/quantity via the persisted cart. This
 * closes the integrity gap in the legacy shipmentController, which
 * trusted the price the client put in the request body.
 */
async function reserveOrder(userId: string, input: CheckoutInput) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new ValidationError('El carrito está vacío.');
    }

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new ValidationError(`"${item.product.name}" ya no está disponible.`);
      }
    }

    const itemsData = cart.items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0] ?? null,
      unitPrice: item.product.price,
      quantity: item.quantity,
      lineTotal: item.product.price.mul(item.quantity),
    }));

    const subtotal = itemsData.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const shippingCost = siteConfig.flatShippingCost;
    const total = subtotal + shippingCost;

    const orderNumber = await nextOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        paymentMethod: input.paymentMethod,
        subtotal,
        shippingCost,
        total,
        currency: siteConfig.defaultCurrency,
        shippingRecipientName: input.recipientName,
        shippingLine1: input.line1,
        shippingLine2: input.line2,
        shippingCity: input.city,
        shippingRegion: input.region,
        shippingPostalCode: input.postalCode,
        shippingCountry: input.country,
        shippingPhone: input.phone,
        items: { create: itemsData },
      },
    });

    // Descuento de stock condicional: el `where` incluye `stock >= cantidad`,
    // así que la comprobación y el descuento ocurren en la MISMA sentencia
    // SQL y Postgres los serializa por fila.
    //
    // Comprobar antes y descontar después (`if (stock < qty) throw` y luego
    // un `decrement` incondicional) parece equivalente pero no lo es: bajo
    // el nivel de aislamiento por defecto (READ COMMITTED), dos checkouts
    // simultáneos leen ambos `stock = 1`, ambos pasan la comprobación, y
    // ambos descuentan → stock queda en -1 y se vendió una unidad que no
    // existe. Con `updateMany` condicional, el segundo no afecta ninguna
    // fila (`count === 0`) y la transacción entera revierte.
    for (const item of cart.items) {
      const { count } = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (count === 0) {
        throw new ValidationError(`No hay suficiente stock de "${item.product.name}".`);
      }
    }

    return order;
  });
}

export async function checkout(userId: string | undefined, input: CheckoutInput) {
  if (!userId) {
    throw new UnauthorizedError('Debes iniciar sesión para completar la compra.');
  }

  const order = await reserveOrder(userId, input);

  // Cash-on-delivery has nothing to charge right now — money changes hands
  // at the door, not at checkout — so only the simulated card gateway can
  // decline. Routing COD through it too would mean an order confirmation
  // screen that randomly fails for a payment that was never attempted.
  const paymentResult =
    input.paymentMethod === 'contra_entrega'
      ? { approved: true as const }
      : await paymentProvider.charge(Number(order.total), input.paymentMethod);

  if (paymentResult.approved) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paymentStatus: 'APPROVED' },
      }),
      prisma.shipment.create({ data: { orderId: order.id, status: 'PENDING' } }),
    ]);
    await cartService.clearCart({ userId });
    return { order, approved: true as const };
  }

  // Payment declined: release the reserved stock and leave the cart intact
  // so the customer can retry without re-adding everything.
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', paymentStatus: 'DECLINED' },
    });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  return { order, approved: false as const, declineReason: paymentResult.declineReason };
}

export async function getOrderByNumber(userId: string, orderNumber: string) {
  return prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true, shipment: true },
  });
}

export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true, shipment: true },
  });
}

export async function listAllOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true, shipment: true, user: { select: { name: true, email: true } } },
  });
}
