import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/config/site.config';
import * as cartService from '@/lib/services/cart.service';
import { calculateDiscount, normalizeCode, redeemCoupon } from '@/lib/services/coupon.service';
import { paymentProvider } from '@/lib/services/payment.service';
import { UnauthorizedError, ValidationError } from '@/lib/utils/errors';
import { ADMIN_PAGE_SIZE, buildPage, toSkipTake } from '@/lib/utils/pagination';

/**
 * Creación de pedidos: la parte más delicada del proyecto.
 *
 * Aquí se concentran las tres reglas que no se pueden relajar, y conviene
 * entenderlas antes de tocar nada de este archivo:
 *
 * 1. **El cliente nunca envía precios.** Solo llegan direcciones y método
 *    de pago; los importes se releen de `Product.price` dentro de la
 *    transacción. Confiar en un precio enviado por el navegador permitiría
 *    a cualquiera comprar a un céntimo modificando la petición.
 *
 * 2. **El stock se descuenta de forma condicional, en una sola sentencia.**
 *    Comprobar y después descontar no es equivalente y produce ventas de
 *    unidades inexistentes (ver el comentario en `reserveOrder`).
 *
 * 3. **Todo importe se calcula con `Decimal`**, jamás con `number`.
 *
 * 4. **El descuento se recalcula aquí.** Del cliente solo llega el código
 *    del cupón; el importe sale de aplicar sus reglas al carrito real.
 *
 * El flujo completo es: reservar (pedido + stock) → cobrar → confirmar o
 * revertir. Se reserva *antes* de cobrar a propósito: cobrar primero y
 * descubrir después que no hay stock obligaría a devolver el dinero.
 */

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
  /**
   * Código escrito por el cliente, opcional.
   *
   * Llega el **código**, nunca el importe del descuento. Aceptar un
   * importe calculado por el navegador sería la misma vulnerabilidad que
   * aceptar precios del navegador.
   */
  couponCode?: string;
}

/**
 * Día actual en UTC como AAAAMMDD.
 *
 * Se usa UTC a propósito: con la hora local del servidor, un cambio de
 * zona horaria o un despliegue en otra región movería el corte del día y
 * podría repetir consecutivos ya entregados.
 */
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
 * Crea el pedido en `PENDING_PAYMENT` y reserva su stock.
 *
 * Es el **único** lugar del proyecto donde se calculan importes de pedido,
 * y siempre releyendo `Product.price` de la base de datos dentro de la
 * transacción. El navegador solo aporta `productId` y cantidad, a través
 * del carrito ya persistido.
 *
 * Todo va en una transacción porque el pedido, sus líneas y el descuento
 * de stock forman una única operación: un pedido creado cuyo stock no se
 * descontó vendería dos veces la misma unidad, y un stock descontado sin
 * pedido perdería inventario sin motivo.
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

    // Un producto puede haberse retirado del catálogo mientras estaba en
    // el carrito. Se comprueba antes de cobrar, no después.
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new ValidationError(`"${item.product.name}" ya no está disponible.`);
      }
    }

    // Instantánea de cada línea: nombre, imagen y precio quedan
    // congelados. El pedido debe seguir siendo legible aunque el producto
    // cambie de precio o desaparezca del catálogo.
    const itemsData = cart.items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0] ?? null,
      unitPrice: item.product.price,
      quantity: item.quantity,
      lineTotal: item.product.price.mul(item.quantity),
    }));

    // Aritmética en `Decimal` de principio a fin. Sumar con `Number` daría
    // el resultado correcto en la mayoría de casos, pero este es el
    // importe que se cobra y se guarda: no es un sitio donde valga
    // "casi siempre bien". `Decimal` es exacto en base 10 por diseño.
    const subtotal = itemsData.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );
    const shippingCost = new Prisma.Decimal(siteConfig.flatShippingCost);

    // El cupón se revalida y se recalcula **dentro de la transacción**,
    // aunque el cliente ya lo hubiera visto aplicado en el carrito. Entre
    // aquel momento y este, el cupón pudo caducar, agotarse o desactivarse,
    // y el carrito pudo cambiar de importe y dejar de alcanzar el mínimo.
    const cupon = input.couponCode ? await resolverCupon(tx, input.couponCode, subtotal) : null;
    const discountAmount = cupon?.discount ?? new Prisma.Decimal(0);

    // El descuento se resta de la mercancía, no del envío.
    const total = subtotal.sub(discountAmount).add(shippingCost);

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
        // Congelados igual que los precios: el pedido debe seguir
        // explicando su propio importe aunque el cupón se borre después.
        couponId: cupon?.couponId ?? null,
        couponCode: cupon?.code ?? null,
        discountAmount,
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

    // Consumir el uso va al final: si algo anterior falla, la transacción
    // revierte y el cupón no queda gastado por una compra que no ocurrió.
    if (cupon) await redeemCoupon(tx, cupon.couponId);

    return order;
  });
}

/**
 * Revalida un cupón contra el carrito real, ya dentro de la transacción.
 *
 * Repite el trabajo de `validateCoupon` en lugar de reutilizarlo porque
 * aquella función usa el cliente global y esta necesita el de transacción:
 * leer el cupón fuera de la transacción abriría exactamente la ventana que
 * el `UPDATE` condicional de `redeemCoupon` se encarga de cerrar.
 *
 * @throws {ValidationError} con el motivo por el que ya no aplica.
 */
async function resolverCupon(
  tx: Prisma.TransactionClient,
  rawCode: string,
  subtotal: Prisma.Decimal,
) {
  const code = normalizeCode(rawCode);
  const coupon = await tx.coupon.findUnique({ where: { code } });

  const ahora = new Date();
  const vigente =
    coupon &&
    coupon.isActive &&
    (!coupon.startsAt || coupon.startsAt <= ahora) &&
    (!coupon.endsAt || coupon.endsAt >= ahora) &&
    (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
    (!coupon.minPurchase || subtotal.gte(coupon.minPurchase));

  if (!coupon || !vigente) {
    throw new ValidationError('El cupón ya no es válido para esta compra.');
  }

  return {
    couponId: coupon.id,
    code: coupon.code,
    discount: calculateDiscount(coupon, subtotal),
  };
}

/**
 * Ejecuta la compra completa.
 *
 * Devuelve el pedido tanto si el pago se aprueba como si se rechaza: la
 * pantalla de confirmación necesita poder explicar qué ocurrió, y un
 * pedido rechazado sigue siendo un registro válido en el historial.
 *
 * @throws {UnauthorizedError} si no hay sesión — comprar exige cuenta,
 *   porque el pedido tiene que quedar asociado a alguien a quien enviarlo.
 */
export async function checkout(userId: string | undefined, input: CheckoutInput) {
  if (!userId) {
    throw new UnauthorizedError('Debes iniciar sesión para completar la compra.');
  }

  const order = await reserveOrder(userId, input);

  // El pago contra entrega no tiene nada que cobrar ahora: el dinero
  // cambia de manos en la puerta. Pasarlo por la pasarela simulada haría
  // que la confirmación fallara al azar para un cobro que nunca se
  // intentó.
  const paymentResult =
    input.paymentMethod === 'contra_entrega'
      ? { approved: true as const }
      : await paymentProvider.charge(Number(order.total), input.paymentMethod);

  if (paymentResult.approved) {
    // El envío se crea junto con el cambio de estado, en la misma
    // transacción: un pedido pagado sin envío quedaría invisible para el
    // panel de despachos.
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paymentStatus: 'APPROVED' },
      }),
      prisma.shipment.create({ data: { orderId: order.id, status: 'PENDING' } }),
    ]);
    // Vaciar el carrito es lo último: si algo falla antes, el cliente
    // conserva lo que había reunido.
    await cartService.clearCart({ userId });
    return { order, approved: true as const };
  }

  // Pago rechazado: se devuelve el stock reservado y el carrito se deja
  // intacto para que el cliente pueda reintentar sin volver a añadirlo
  // todo. El pedido queda como CANCELLED, no se borra: es la evidencia de
  // que hubo un intento, útil para soporte.
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', paymentStatus: 'DECLINED' },
    });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      // `productId` es nulo si el producto se borró entre la reserva y el
      // rechazo. No hay a qué devolver el stock; se ignora la línea.
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  return { order, approved: false as const, declineReason: paymentResult.declineReason };
}

/**
 * Un pedido concreto del cliente.
 *
 * El `userId` va en el `where`, no se comprueba después: así es imposible
 * que alguien vea el pedido de otra persona probando números de pedido.
 * `findFirst` en lugar de `findUnique` porque la búsqueda combina dos
 * campos y solo `orderNumber` es único.
 */
export async function getOrderByNumber(userId: string, orderNumber: string) {
  return prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true, shipment: true },
  });
}

/** Historial del cliente, del más reciente al más antiguo. */
export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true, shipment: true },
  });
}

/**
 * Pedidos del panel, paginados y del más reciente al más antiguo.
 *
 * De `user` solo se traen nombre y correo: es lo que la tabla muestra, y
 * evita arrastrar el hash de contraseña en cada consulta.
 *
 * La paginación no es cosmética: cada fila incluye sus líneas de pedido y
 * su envío, así que una tienda con miles de pedidos traería decenas de
 * miles de filas en cada visita al panel.
 */
export async function listAllOrders(page = 1) {
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, shipment: true, user: { select: { name: true, email: true } } },
      ...toSkipTake(page, ADMIN_PAGE_SIZE),
    }),
    prisma.order.count(),
  ]);

  return buildPage(items, total, page, ADMIN_PAGE_SIZE);
}
