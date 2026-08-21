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

function formatOrderNumber(sequence: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `PCD-${y}${m}${d}-${String(sequence).padStart(4, '0')}`;
}

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const countToday = await tx.order.count({ where: { createdAt: { gte: startOfDay } } });
  return formatOrderNumber(countToday + 1);
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
      if (item.product.stock < item.quantity) {
        throw new ValidationError(`No hay suficiente stock de "${item.product.name}".`);
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

    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return order;
  });
}

const ORDER_NUMBER_UNIQUE_VIOLATION = 'P2002';

async function reserveOrderWithRetry(userId: string, input: CheckoutInput, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await reserveOrder(userId, input);
    } catch (err) {
      const isOrderNumberClash =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === ORDER_NUMBER_UNIQUE_VIOLATION &&
        attempt < attempts;
      if (!isOrderNumberClash) throw err;
    }
  }
  throw new Error('No se pudo generar un número de pedido único.');
}

export async function checkout(userId: string | undefined, input: CheckoutInput) {
  if (!userId) {
    throw new UnauthorizedError('Debes iniciar sesión para completar la compra.');
  }

  const order = await reserveOrderWithRetry(userId, input);

  const paymentResult = await paymentProvider.charge(Number(order.total), input.paymentMethod);

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
