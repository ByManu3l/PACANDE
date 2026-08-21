import { auth } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/utils/errors';

/**
 * Defense in depth: middleware.ts only protects page navigation. A Server
 * Action can be invoked directly (e.g. from devtools) bypassing routing
 * entirely, so every admin mutation must call requireRole() itself too.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError('Debes iniciar sesión para continuar.');
  }
  return session.user;
}

export async function requireRole(roles: Array<'USER' | 'ADMIN' | 'SUPERADMIN'>) {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError('No tienes permisos para realizar esta acción.');
  }
  return user;
}
