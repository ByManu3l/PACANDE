import type { UserRole } from '@/generated/prisma/client';
import { auth } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/utils/errors';

/**
 * Exige una sesión iniciada y devuelve el usuario.
 *
 * **Por qué también aquí, si ya existe `proxy.ts`:** el proxy solo filtra
 * la *navegación* entre páginas. Una Server Action es un endpoint HTTP
 * real y se puede invocar directamente — con `fetch` desde la consola del
 * navegador, por ejemplo — sin pasar por ninguna ruta protegida. Por eso
 * toda mutación comprueba los permisos por su cuenta: el proxy es
 * comodidad para el usuario, esto es la seguridad de verdad.
 *
 * Lanza en vez de redirigir porque las Server Actions no pueden redirigir
 * limpiamente; `withActionResult` recoge el error y lo convierte en un
 * mensaje. En los *layouts* se usa `redirect()` directamente, que sí es
 * lo apropiado allí.
 *
 * @throws {UnauthorizedError} si no hay sesión.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError('Debes iniciar sesión para continuar.');
  }
  return session.user;
}

/**
 * Exige una sesión **y** que su rol esté entre los aceptados.
 *
 * Debe ser la primera línea de toda Server Action de administración.
 *
 * @param roles Roles admitidos, p. ej. `['ADMIN', 'SUPERADMIN']`.
 * @throws {UnauthorizedError} si no hay sesión.
 * @throws {ForbiddenError} si el rol no está en la lista.
 */
export async function requireRole(roles: UserRole[]) {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError('No tienes permisos para realizar esta acción.');
  }
  return user;
}
