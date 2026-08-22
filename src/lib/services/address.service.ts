import { prisma } from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Libreta de direcciones del cliente.
 *
 * **No es la dirección de un pedido.** Un pedido guarda su propia copia en
 * texto plano, precisamente para que editar o borrar una dirección de aquí
 * no altere a dónde se envió una compra pasada. Esto solo sirve para
 * rellenar el formulario de checkout sin volver a teclearlo todo.
 *
 * Todas las funciones reciben `userId` y lo incluyen en el `where`, nunca
 * comprueban la propiedad después de leer. Así es imposible que alguien
 * acceda a la dirección de otra persona probando identificadores.
 */

/** Tope de direcciones por cuenta. */
const MAX_DIRECCIONES = 10;

export interface AddressInput {
  label: string;
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

/** Direcciones del usuario, con la predeterminada primero. */
export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

/** La predeterminada, para preseleccionarla en el checkout. */
export async function getDefaultAddress(userId: string) {
  return prisma.address.findFirst({ where: { userId, isDefault: true } });
}

/**
 * Crea una dirección.
 *
 * La primera se marca como predeterminada aunque no se pida: una libreta
 * con una sola dirección y ninguna preseleccionada no tiene sentido, y
 * obligaría a elegir en cada compra.
 */
export async function createAddress(userId: string, input: AddressInput) {
  return prisma.$transaction(async (tx) => {
    const existentes = await tx.address.count({ where: { userId } });

    if (existentes >= MAX_DIRECCIONES) {
      throw new ValidationError(
        `Puedes guardar hasta ${MAX_DIRECCIONES} direcciones. Elimina alguna para añadir otra.`,
      );
    }

    const esPredeterminada = input.isDefault || existentes === 0;
    if (esPredeterminada) await desmarcarPredeterminadas(tx, userId);

    return tx.address.create({
      data: { ...input, line2: input.line2 || null, userId, isDefault: esPredeterminada },
    });
  });
}

/**
 * Actualiza una dirección propia.
 *
 * @throws {NotFoundError} si no existe o no pertenece a este usuario. Se
 *   responde igual en ambos casos: distinguirlos revelaría qué
 *   identificadores existen.
 */
export async function updateAddress(userId: string, addressId: string, input: AddressInput) {
  return prisma.$transaction(async (tx) => {
    const actual = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!actual) throw new NotFoundError('Dirección no encontrada.');

    if (input.isDefault) await desmarcarPredeterminadas(tx, userId);

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...input,
        line2: input.line2 || null,
        // Una dirección que ya era la predeterminada no deja de serlo por
        // editarla: desmarcarla dejaría la cuenta sin ninguna.
        isDefault: input.isDefault || actual.isDefault,
      },
    });
  });
}

/**
 * Elimina una dirección propia.
 *
 * Si era la predeterminada, la más reciente de las restantes ocupa su
 * lugar. Sin eso, borrar la predeterminada dejaría la libreta sin ninguna
 * marcada y el checkout sin nada que preseleccionar.
 */
export async function deleteAddress(userId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const actual = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!actual) throw new NotFoundError('Dirección no encontrada.');

    await tx.address.delete({ where: { id: addressId } });

    if (actual.isDefault) {
      const siguiente = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (siguiente) {
        await tx.address.update({ where: { id: siguiente.id }, data: { isDefault: true } });
      }
    }
  });
}

/** Marca una dirección como predeterminada. */
export async function setDefaultAddress(userId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const existe = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!existe) throw new NotFoundError('Dirección no encontrada.');

    await desmarcarPredeterminadas(tx, userId);
    await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
  });
}

/**
 * Quita la marca de predeterminada a todas las del usuario.
 *
 * Se hace así, y siempre dentro de la misma transacción que marca la
 * nueva, porque el schema no puede expresar «como mucho una por usuario»:
 * un índice único sobre `(userId, isDefault)` impediría tener dos
 * direcciones *no* predeterminadas, que es el caso normal.
 */
function desmarcarPredeterminadas(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
) {
  return tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
}
