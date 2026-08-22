'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@/lib/auth/guards';
import * as addressService from '@/lib/services/address.service';
import { runAction } from '@/lib/utils/action-result';
import { addressSchema } from '@/lib/validations/address';

/**
 * Libreta de direcciones del propio cliente.
 *
 * Todas las acciones pasan `user.id` al servicio, que lo incluye en el
 * `where` de cada consulta. Ninguna comprueba la propiedad *después* de
 * leer: así es imposible acceder a la dirección de otra persona probando
 * identificadores, y el resultado es idéntico —«no encontrada»— tanto si
 * no existe como si es de otro, que es lo que evita deducir qué
 * identificadores son reales.
 */

export async function createAddressAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSession();
    await addressService.createAddress(user.id, addressSchema.parse(input));
    revalidateAddressPages();
  });
}

export async function updateAddressAction(addressId: string, input: unknown) {
  return runAction(async () => {
    const user = await requireSession();
    await addressService.updateAddress(user.id, addressId, addressSchema.parse(input));
    revalidateAddressPages();
  });
}

export async function deleteAddressAction(addressId: string) {
  return runAction(async () => {
    const user = await requireSession();
    await addressService.deleteAddress(user.id, addressId);
    revalidateAddressPages();
  });
}

export async function setDefaultAddressAction(addressId: string) {
  return runAction(async () => {
    const user = await requireSession();
    await addressService.setDefaultAddress(user.id, addressId);
    revalidateAddressPages();
  });
}

/** El checkout preselecciona la predeterminada, así que también cambia. */
function revalidateAddressPages() {
  revalidatePath('/cuenta/direcciones');
  revalidatePath('/checkout');
}
