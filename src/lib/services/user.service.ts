import { compare, hash, hashSync } from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/utils/errors';

const BCRYPT_ROUNDS = 10;

/**
 * Hash descartable contra el que se compara cuando el correo no existe,
 * para gastar el mismo tiempo de CPU (ver `verifyCredentials`). El texto
 * plano que lo generó es irrelevante: nunca puede coincidir con éxito.
 *
 * **Invariante:** debe generarse con el mismo `BCRYPT_ROUNDS` que los
 * hashes almacenados. Si algún día se sube el coste, hay que rehashear las
 * contraseñas existentes o el señuelo volverá a tardar distinto y
 * reintroducirá la fuga de tiempo que existe para evitar.
 */
const DUMMY_HASH = hashSync('placeholder-para-igualar-el-tiempo-de-respuesta', BCRYPT_ROUNDS);

/**
 * Verifica credenciales y devuelve el usuario, o `null` si no coinciden.
 *
 * Siempre ejecuta un `compare` de bcrypt, incluso cuando el correo no
 * existe. Salir antes con un `return null` haría la respuesta
 * perceptiblemente más rápida para correos no registrados (bcrypt con
 * coste 10 tarda ~100 ms), y esa diferencia de tiempo permite a un
 * atacante enumerar qué correos tienen cuenta sin necesidad de adivinar
 * ninguna contraseña.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('Ya existe una cuenta con ese correo.');
  }

  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Comprueba la contraseña actual de un usuario. Interna a propósito: la
 * usa `changePassword`, y no se exporta porque nada más la necesita. */
async function verifyPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return compare(password, user.passwordHash);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const valid = await verifyPassword(userId, currentPassword);
  if (!valid) {
    throw new UnauthorizedError('La contraseña actual no es correcta.');
  }

  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });
}

export async function updateProfile(userId: string, input: { name: string; email: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing && existing.id !== userId) {
    throw new ConflictError('Ya existe una cuenta con ese correo.');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
}

/**
 * Cambia la foto de perfil y devuelve la ruta de la anterior, para que
 * quien llama pueda borrar el archivo que quedó huérfano. Sin ese dato,
 * cada cambio de avatar deja un archivo muerto en disco para siempre.
 */
export async function updateAvatar(userId: string, imagePath: string) {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  await prisma.user.update({ where: { id: userId }, data: { image: imagePath } });

  return { previousImage: previous?.image ?? null };
}

/**
 * A Superadmin can never delete or change the role of their own account —
 * unlike the legacy backend, this applies with no role-based exception.
 */
export function assertNotActingOnSelf(actorId: string, targetId: string, action: string) {
  if (actorId === targetId) {
    throw new ForbiddenError(`No puedes ${action} tu propia cuenta.`);
  }
}

type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
  });
}

/** An Admin may only manage plain USER accounts — only a Superadmin can
 * touch another Admin or Superadmin. Mirrors the legacy adminController
 * restriction, now enforced in one place instead of duplicated per-route. */
export function assertCanManageTarget(actorRole: Role, targetRole: Role) {
  if (actorRole === 'ADMIN' && targetRole !== 'USER') {
    throw new ForbiddenError('Como Admin, solo puedes gestionar cuentas de Usuario.');
  }
}

export async function adminUpdateUser(
  actorId: string,
  actorRole: Role,
  targetId: string,
  input: { name: string; email: string; password?: string; role?: Role },
) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new ConflictError('Usuario no encontrado.');

  assertCanManageTarget(actorRole, target.role);

  if (input.role && input.role !== target.role) {
    if (actorRole !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un Superadmin puede cambiar roles.');
    }
    assertNotActingOnSelf(actorId, targetId, 'cambiar el rol de');
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail && existingEmail.id !== targetId) {
    throw new ConflictError('Ya existe una cuenta con ese correo.');
  }

  const passwordHash = input.password ? await hash(input.password, BCRYPT_ROUNDS) : undefined;

  return prisma.user.update({
    where: { id: targetId },
    data: {
      name: input.name,
      email: input.email,
      role: actorRole === 'SUPERADMIN' ? input.role : undefined,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function adminDeleteUser(actorId: string, actorRole: Role, targetId: string) {
  assertNotActingOnSelf(actorId, targetId, 'eliminar');

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new ConflictError('Usuario no encontrado.');

  assertCanManageTarget(actorRole, target.role);

  // Order.userId is onDelete: Restrict — preserves purchase history. Check
  // up front so the admin gets a clear reason instead of a raw FK error.
  const orderCount = await prisma.order.count({ where: { userId: targetId } });
  if (orderCount > 0) {
    throw new ValidationError(
      `No se puede eliminar: tiene ${orderCount} pedido(s) asociado(s). El historial de compras debe conservarse.`,
    );
  }

  await prisma.user.delete({ where: { id: targetId } });
}
