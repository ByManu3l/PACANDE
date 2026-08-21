import { compare, hash } from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { ConflictError, ForbiddenError, UnauthorizedError } from '@/lib/utils/errors';

const BCRYPT_ROUNDS = 10;

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

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

/** Re-authentication before a sensitive action (change password, change own role, etc). */
export async function verifyPassword(userId: string, password: string) {
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

export async function updateAvatar(userId: string, imagePath: string) {
  return prisma.user.update({ where: { id: userId }, data: { image: imagePath } });
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
