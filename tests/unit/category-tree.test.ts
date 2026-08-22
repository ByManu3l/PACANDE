import { describe, expect, it } from 'vitest';

import { createCategory, deleteCategory, updateCategory } from '@/lib/services/category.service';
import { ConflictError, ValidationError } from '@/lib/utils/errors';

import { createCategory as makeCategory, createProduct } from './factories';

function input(over: Partial<Parameters<typeof createCategory>[0]> = {}) {
  return {
    name: 'Categoria',
    slug: `cat-${Math.random().toString(36).slice(2, 10)}`,
    description: undefined,
    parentId: undefined,
    position: 0,
    isActive: true,
    ...over,
  };
}

describe('integridad del arbol de categorias', () => {
  it('rechaza que una categoria sea su propia madre', async () => {
    const cat = await createCategory(input());

    await expect(
      updateCategory(cat.id, input({ slug: cat.slug, parentId: cat.id })),
    ).rejects.toThrow(ValidationError);
  });

  it('rechaza mover una categoria dentro de su propia descendiente', async () => {
    // abuela -> madre -> hija. Colgar la abuela de la hija cerraria un
    // ciclo y las tres desaparecerian del menu, porque el recorrido parte
    // de las raices y un ciclo no tiene raiz.
    const grandma = await createCategory(input({ slug: 'abuela' }));
    const mother = await createCategory(input({ slug: 'madre', parentId: grandma.id }));
    const child = await createCategory(input({ slug: 'hija', parentId: mother.id }));

    await expect(
      updateCategory(grandma.id, input({ slug: 'abuela', parentId: child.id })),
    ).rejects.toThrow(ValidationError);

    // Un movimiento legitimo hacia abajo sigue permitido.
    const other = await createCategory(input({ slug: 'otra' }));
    await expect(
      updateCategory(other.id, input({ slug: 'otra', parentId: child.id })),
    ).resolves.toBeTruthy();
  });

  it('traduce el slug duplicado a un mensaje entendible', async () => {
    await createCategory(input({ slug: 'repetida' }));
    await expect(createCategory(input({ slug: 'repetida' }))).rejects.toThrow(ConflictError);
  });
});

describe('borrado de categorias', () => {
  it('no borra una categoria que todavia tiene productos', async () => {
    const category = await makeCategory();
    await createProduct(category.id, { slug: 'ocupa-categoria' });

    await expect(deleteCategory(category.id)).rejects.toThrow(ValidationError);
  });

  it('no borra una categoria que tiene subcategorias', async () => {
    const parent = await createCategory(input({ slug: 'con-hijas' }));
    await createCategory(input({ slug: 'la-hija', parentId: parent.id }));

    await expect(deleteCategory(parent.id)).rejects.toThrow(ValidationError);
  });

  it('borra una categoria vacia', async () => {
    const cat = await createCategory(input({ slug: 'vacia' }));
    await expect(deleteCategory(cat.id)).resolves.not.toThrow();
  });
});
