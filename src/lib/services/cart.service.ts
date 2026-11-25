import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { precioConDescuento } from '@/lib/utils/discount';
import { ValidationError } from '@/lib/utils/errors';

/**
 * Carrito de compra, persistido en base de datos.
 *
 * Un carrito pertenece **o** a un usuario **o** a un visitante anónimo,
 * nunca a los dos. El anónimo se identifica con un token opaco que guarda
 * una cookie; al iniciar sesión, `mergeGuestCartIntoUser` vuelca su
 * contenido en el del usuario y lo elimina.
 *
 * **El carrito no reserva inventario.** Tener algo en el carrito no
 * garantiza poder comprarlo: el stock se descuenta al pagar, en
 * `order.service.ts`, con un UPDATE condicional. Las comprobaciones de
 * stock de este módulo existen para avisar pronto, no para garantizar
 * nada — entre añadir al carrito y pagar puede pasar cualquier cosa.
 * Reservar de verdad exigiría expirar reservas abandonadas, y esa es
 * complejidad que una plantilla no debería imponer.
 */

interface CartIdentity {
  /** Presente si hay sesión iniciada. Tiene prioridad sobre el token. */
  userId?: string;
  /** Token de la cookie del visitante anónimo. */
  guestToken?: string;
}

/**
 * Forma canónica de cargar un carrito.
 *
 * El `orderBy: id` no es decorativo: sin él Postgres puede devolver las
 * líneas en cualquier orden y el carrito se reordenaría solo entre
 * recargas, lo que se percibe como un fallo.
 */
const CART_INCLUDE = {
  items: {
    include: { product: true },
    orderBy: { id: 'asc' as const },
  },
};

async function findCart(identity: CartIdentity) {
  if (identity.userId) {
    return prisma.cart.findUnique({ where: { userId: identity.userId }, include: CART_INCLUDE });
  }
  if (identity.guestToken) {
    return prisma.cart.findUnique({
      where: { guestToken: identity.guestToken },
      include: CART_INCLUDE,
    });
  }
  return null;
}

/**
 * Devuelve el carrito de esta identidad, creándolo si aún no existe.
 *
 * Si hay `userId` se ignora el `guestToken`: una vez con sesión, el
 * carrito válido es el de la cuenta.
 */
export async function getOrCreateCart(identity: CartIdentity) {
  const existing = await findCart(identity);
  if (existing) return existing;

  const cart = await prisma.cart.create({
    data: {
      userId: identity.userId,
      guestToken: identity.userId ? undefined : identity.guestToken,
    },
  });
  return prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: CART_INCLUDE });
}

/** Lee el carrito sin crearlo. Para vistas que solo muestran el contador. */
export async function getCart(identity: CartIdentity) {
  return findCart(identity);
}

/** Token del carrito anónimo. UUID v4: opaco y no adivinable. */
export function newGuestToken() {
  return randomUUID();
}

/**
 * Añade unidades, sumando a la línea si el producto ya estaba.
 *
 * La cantidad se compara contra el stock teniendo en cuenta lo que ya
 * había en el carrito, no solo lo que se añade ahora. Sin eso, pulsar
 * "añadir" diez veces dejaría pasar diez unidades de un producto con una
 * sola disponible, y el problema no aparecería hasta el momento de pagar.
 *
 * @throws {ValidationError} si el producto no está disponible o no hay
 *   stock suficiente para la cantidad resultante.
 */
export async function addItem(identity: CartIdentity, productId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ValidationError('La cantidad debe ser un número entero de al menos 1.');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    throw new ValidationError('El producto ya no está disponible.');
  }

  const cart = await getOrCreateCart(identity);
  const existingItem = cart.items.find((item) => item.productId === productId);
  const resulting = (existingItem?.quantity ?? 0) + quantity;

  assertStock(product.name, product.stock, resulting);

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: resulting },
    });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  }

  return getOrCreateCart(identity);
}

/**
 * Fija la cantidad de una línea. Una cantidad menor que 1 elimina la
 * línea, que es lo que espera quien vacía el campo o pulsa "−" en el uno.
 */
export async function updateItemQuantity(
  identity: CartIdentity,
  productId: string,
  quantity: number,
) {
  const cart = await getOrCreateCart(identity);

  if (quantity < 1) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return getOrCreateCart(identity);
  }

  if (!Number.isInteger(quantity)) {
    throw new ValidationError('La cantidad debe ser un número entero.');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    throw new ValidationError('El producto ya no está disponible.');
  }
  assertStock(product.name, product.stock, quantity);

  // `updateMany` en vez de `update` porque la condición es (carrito,
  // producto) y no el id de la línea: así no hace falta buscarla antes, y
  // si no existe simplemente no actualiza nada en lugar de lanzar.
  await prisma.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { quantity } });

  return getOrCreateCart(identity);
}

function assertStock(productName: string, stock: number, wanted: number) {
  if (wanted > stock) {
    throw new ValidationError(
      stock === 0
        ? `"${productName}" está agotado.`
        : `Solo quedan ${stock} unidad(es) de "${productName}".`,
    );
  }
}

export async function removeItem(identity: CartIdentity, productId: string) {
  const cart = await getOrCreateCart(identity);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return getOrCreateCart(identity);
}

/** Vacía el carrito conservándolo. Lo llama el checkout tras cobrar. */
export async function clearCart(identity: CartIdentity) {
  const cart = await getOrCreateCart(identity);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

/**
 * Vuelca el carrito anónimo en el del usuario recién autenticado.
 *
 * Se llama justo después de entrar o registrarse. Sin esto, lo que
 * alguien había añadido antes de iniciar sesión desaparecería en el
 * momento exacto en que más gente abandona la compra.
 *
 * Va **entero dentro de una transacción**: son varias escrituras
 * dependientes, y un fallo a medias dejaría el carrito de invitado
 * parcialmente volcado y aun así borrado, perdiendo líneas. O se aplica
 * todo, o no se aplica nada.
 *
 * Los productos presentes en ambos carritos suman cantidades. Esa suma
 * puede superar el stock disponible; se acepta a propósito, porque
 * rechazar la fusión perdería lo que el visitante había reunido. El
 * checkout es quien tiene la última palabra sobre el stock.
 */
export async function mergeGuestCartIntoUser(guestToken: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    });
    if (!guestCart) return;

    if (guestCart.items.length > 0) {
      const userCart =
        (await tx.cart.findUnique({ where: { userId } })) ??
        (await tx.cart.create({ data: { userId } }));

      for (const guestItem of guestCart.items) {
        // `upsert` sobre el índice único (cartId, productId) resuelve en
        // una sola sentencia el "si ya está, suma; si no, créalo", sin la
        // lectura previa que antes se hacía para cada línea.
        await tx.cartItem.upsert({
          where: {
            cartId_productId: { cartId: userCart.id, productId: guestItem.productId },
          },
          update: { quantity: { increment: guestItem.quantity } },
          create: {
            cartId: userCart.id,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
          },
        });
      }
    }

    // El carrito anónimo ya cumplió su función. Sus líneas se van en
    // cascada (`CartItem.cartId` es `onDelete: Cascade`).
    await tx.cart.delete({ where: { id: guestCart.id } });
  });
}

/**
 * Resumen para la cabecera y el bloque lateral del carrito.
 *
 * `subtotal` se calcula con `Number`, es decir en coma flotante. Es
 * aceptable **solo porque este valor es informativo**: el importe que se
 * cobra lo recalcula `order.service.ts` dentro de la base de datos con
 * `Decimal`, releyendo los precios. Nunca uses este subtotal para cobrar
 * ni para guardarlo en un pedido.
 */
export function cartTotals(cart: {
  items: { quantity: number; product: { price: unknown; discountPercent?: number } }[];
}) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  // Se usa el precio con descuento, no el de lista: este subtotal es lo que
  // ve quien está a punto de pagar, y tiene que coincidir con lo que
  // `reserveOrder` acabará cobrando.
  const subtotal = cart.items.reduce(
    (sum, item) =>
      sum +
      Number(precioConDescuento(item.product.price as string, item.product.discountPercent ?? 0)) *
        item.quantity,
    0,
  );
  return { itemCount, subtotal };
}
