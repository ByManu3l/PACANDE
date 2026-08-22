'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/guards';
import * as categoryService from '@/lib/services/category.service';
import { runAction } from '@/lib/utils/action-result';
import { type CategoryInput, categorySchema } from '@/lib/validations/category';

/**
 * Gestión del árbol de categorías desde el panel.
 *
 * Toda acción de esta carpeta sigue la misma secuencia, y conviene
 * respetarla al añadir nuevas:
 *
 *   1. `requireRole(...)` — **siempre lo primero**. Una Server Action es
 *      un endpoint HTTP invocable directamente; `proxy.ts` no la protege.
 *   2. `schema.parse(...)` — nunca confiar en la validación del navegador.
 *   3. llamar al servicio — aquí no se toca Prisma (ver `ARQUITECTURA.md`).
 *   4. `revalidatePath(...)` — invalidar lo que acaba de quedar obsoleto.
 *
 * Los pasos 2–4 van envueltos en `runAction`, que traduce cualquier error
 * de dominio al `{ ok: false, error }` que el formulario sabe mostrar.
 */

/**
 * Lectura para la tabla del panel.
 *
 * No usa `runAction` porque no es una mutación: si falla, debe romper el
 * render en vez de devolver un objeto de error que la tabla ignoraría.
 */
export async function listCategoriesAction() {
  await requireRole(['ADMIN', 'SUPERADMIN']);
  return categoryService.listCategoriesForAdmin();
}

export async function createCategoryAction(input: CategoryInput) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await categoryService.createCategory(categorySchema.parse(input));
    revalidateCategoryPages();
  });
}

export async function updateCategoryAction(id: string, input: CategoryInput) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await categoryService.updateCategory(id, categorySchema.parse(input));
    revalidateCategoryPages();
  });
}

export async function deleteCategoryAction(id: string) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']);
    await categoryService.deleteCategory(id);
    revalidateCategoryPages();
  });
}

/**
 * Invalida todo lo que depende del árbol de categorías.
 *
 * El `'layout'` es necesario: sin él solo se refrescaría `/categoria`
 * exacta, y las páginas afectadas son las de cada slug. Además el menú de
 * navegación lista categorías en el layout raíz, así que un cambio aquí
 * se ve en toda la tienda, no solo en la página de la categoría.
 */
function revalidateCategoryPages() {
  revalidatePath('/admin/categorias');
  revalidatePath('/categoria', 'layout');
}
