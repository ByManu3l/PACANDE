import { describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  createAddress,
  deleteAddress,
  getDefaultAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/lib/services/address.service';
import {
  countWishlist,
  getWishlistedIds,
  listWishlist,
  toggleWishlist,
} from '@/lib/services/wishlist.service';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

function direccion(over: Partial<Parameters<typeof createAddress>[1]> = {}) {
  return {
    label: 'Casa',
    recipientName: 'Ana Pérez',
    line1: 'Calle 1 #2-3',
    city: 'Bogotá',
    region: 'Cundinamarca',
    postalCode: '110111',
    country: 'CO',
    phone: '3000000000',
    isDefault: false,
    ...over,
  };
}

describe('favoritos', () => {
  it('el botón alterna: añade y quita', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id);

    expect(await toggleWishlist(user.id, product.id)).toBe(true);
    expect(await countWishlist(user.id)).toBe(1);

    expect(await toggleWishlist(user.id, product.id)).toBe(false);
    expect(await countWishlist(user.id)).toBe(0);
  });

  it('no lista productos retirados del catálogo', async () => {
    // Mostrarlos llevaría a una ficha que ya no existe.
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id);
    await toggleWishlist(user.id, product.id);

    await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });

    expect(await listWishlist(user.id)).toHaveLength(0);
    expect(await countWishlist(user.id)).toBe(0);
  });

  it('los favoritos de una persona no se ven desde otra cuenta', async () => {
    const ana = await createUser();
    const luis = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id);

    await toggleWishlist(ana.id, product.id);

    expect(await listWishlist(luis.id)).toHaveLength(0);
    expect(await getWishlistedIds(luis.id, [product.id]).then((s) => s.size)).toBe(0);
  });

  it('resuelve la grilla entera en una consulta', async () => {
    const user = await createUser();
    const category = await createCategory();
    const a = await createProduct(category.id, { slug: 'fav-a' });
    const b = await createProduct(category.id, { slug: 'fav-b' });
    const c = await createProduct(category.id, { slug: 'fav-c' });

    await toggleWishlist(user.id, a.id);
    await toggleWishlist(user.id, c.id);

    const marcados = await getWishlistedIds(user.id, [a.id, b.id, c.id]);
    expect([...marcados].sort()).toEqual([a.id, c.id].sort());
  });

  it('con una lista vacía no consulta nada', async () => {
    const user = await createUser();
    expect((await getWishlistedIds(user.id, [])).size).toBe(0);
  });

  it('borrar la cuenta se lleva sus favoritos', async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category.id);
    await toggleWishlist(user.id, product.id);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.wishlistItem.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe('libreta de direcciones', () => {
  it('la primera dirección queda como predeterminada aunque no se pida', async () => {
    // Una libreta con una sola dirección y ninguna preseleccionada
    // obligaría a elegir en cada compra.
    const user = await createUser();
    const creada = await createAddress(user.id, direccion({ isDefault: false }));

    expect(creada.isDefault).toBe(true);
  });

  it('marcar una nueva como predeterminada desmarca la anterior', async () => {
    const user = await createUser();
    const casa = await createAddress(user.id, direccion({ label: 'Casa' }));
    const oficina = await createAddress(user.id, direccion({ label: 'Oficina', isDefault: true }));

    const predeterminada = await getDefaultAddress(user.id);
    expect(predeterminada?.id).toBe(oficina.id);

    const releida = await prisma.address.findUniqueOrThrow({ where: { id: casa.id } });
    expect(releida.isDefault).toBe(false);
  });

  it('nunca hay dos predeterminadas a la vez', async () => {
    const user = await createUser();
    const a = await createAddress(user.id, direccion({ label: 'A' }));
    const b = await createAddress(user.id, direccion({ label: 'B' }));
    const c = await createAddress(user.id, direccion({ label: 'C' }));

    await setDefaultAddress(user.id, b.id);
    await setDefaultAddress(user.id, c.id);

    const marcadas = await prisma.address.count({ where: { userId: user.id, isDefault: true } });
    expect(marcadas).toBe(1);
    expect((await getDefaultAddress(user.id))?.id).toBe(c.id);
    expect(a.id).toBeTruthy();
  });

  it('editar la predeterminada no la deja de serlo', async () => {
    // Desmarcarla al editar dejaría la cuenta sin ninguna.
    const user = await createUser();
    const casa = await createAddress(user.id, direccion());

    const editada = await updateAddress(user.id, casa.id, direccion({ city: 'Medellín' }));

    expect(editada.isDefault).toBe(true);
    expect(editada.city).toBe('Medellín');
  });

  it('al borrar la predeterminada, otra ocupa su lugar', async () => {
    const user = await createUser();
    const casa = await createAddress(user.id, direccion({ label: 'Casa' }));
    await createAddress(user.id, direccion({ label: 'Oficina' }));

    await deleteAddress(user.id, casa.id);

    const predeterminada = await getDefaultAddress(user.id);
    expect(predeterminada).not.toBeNull();
    expect(predeterminada?.label).toBe('Oficina');
  });

  it('nadie puede leer ni editar la dirección de otra persona', async () => {
    const ana = await createUser();
    const luis = await createUser();
    const deAna = await createAddress(ana.id, direccion());

    await expect(updateAddress(luis.id, deAna.id, direccion())).rejects.toThrow(NotFoundError);
    await expect(deleteAddress(luis.id, deAna.id)).rejects.toThrow(NotFoundError);
    await expect(setDefaultAddress(luis.id, deAna.id)).rejects.toThrow(NotFoundError);

    expect(await listAddresses(luis.id)).toHaveLength(0);
  });

  it('limita cuántas direcciones se pueden guardar', async () => {
    const user = await createUser();
    for (let i = 0; i < 10; i++) {
      await createAddress(user.id, direccion({ label: `Dir ${i}` }));
    }

    await expect(createAddress(user.id, direccion({ label: 'Once' }))).rejects.toThrow(
      ValidationError,
    );
  });

  it('lista la predeterminada primero', async () => {
    const user = await createUser();
    await createAddress(user.id, direccion({ label: 'Primera' }));
    const segunda = await createAddress(user.id, direccion({ label: 'Segunda', isDefault: true }));

    const lista = await listAddresses(user.id);
    expect(lista[0].id).toBe(segunda.id);
  });
});
