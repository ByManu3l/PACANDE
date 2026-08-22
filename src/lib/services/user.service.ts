import { compare, hash, hashSync } from 'bcryptjs';

import type { UserRole } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import {
  ConflictError,
  ForbiddenError,
  isUniqueViolation,
  UnauthorizedError,
  ValidationError,
} from '@/lib/utils/errors';

/**
 * Cuentas de usuario: registro, credenciales, perfil y administración.
 *
 * Dos criterios recorren todo el archivo:
 *
 * - **Nunca se devuelve `passwordHash`.** Cada lectura usa un `select`
 *   explícito. Es fácil de olvidar, y el hash acabaría viajando al
 *   navegador dentro de la sesión o de una tabla del panel.
 * - **Los permisos se deciden aquí**, no en las acciones. `requireRole`
 *   solo distingue USER/ADMIN/SUPERADMIN; quién puede actuar sobre quién
 *   son reglas de negocio y viven junto a los datos que protegen.
 */

/**
 * Coste de bcrypt. 10 es el equilibrio habitual entre resistencia a la
 * fuerza bruta y tiempo de respuesta (~100 ms por comparación).
 *
 * Subirlo invalida el señuelo `DUMMY_HASH` si no se regenera, y obliga a
 * rehashear las contraseñas existentes para que sigan verificándose en el
 * mismo tiempo. Lee la nota de `DUMMY_HASH` antes de cambiarlo.
 */
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

/**
 * Crea una cuenta y devuelve el usuario sin datos sensibles.
 *
 * El correo repetido se detecta por el índice único y no con un SELECT
 * previo: entre esa lectura y la inserción cabe otro registro con el
 * mismo correo, y solo la base de datos puede impedirlo (ver
 * `isUniqueViolation`).
 *
 * @throws {ConflictError} si el correo ya tiene cuenta.
 */
export async function registerUser(input: { name: string; email: string; password: string }) {
  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch (err) {
    if (isUniqueViolation(err, 'email')) {
      throw new ConflictError('Ya existe una cuenta con ese correo.');
    }
    throw err;
  }
}

/** Comprueba la contraseña actual de un usuario. Interna a propósito: la
 * usa `changePassword`, y no se exporta porque nada más la necesita. */
async function verifyPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return compare(password, user.passwordHash);
}

/**
 * Cambia la contraseña, exigiendo la actual.
 *
 * @throws {UnauthorizedError} si la contraseña actual no coincide.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const valid = await verifyPassword(userId, currentPassword);
  if (!valid) {
    throw new UnauthorizedError('La contraseña actual no es correcta.');
  }

  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/** Datos públicos del perfil. Sin `passwordHash`, gracias al `select`. */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });
}

/**
 * Actualiza nombre y correo del propio usuario.
 *
 * @throws {ConflictError} si el correo ya pertenece a otra cuenta.
 */
export async function updateProfile(userId: string, input: { name: string; email: string }) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { name: input.name, email: input.email },
      select: { id: true, name: true, email: true, image: true, role: true },
    });
  } catch (err) {
    if (isUniqueViolation(err, 'email')) {
      throw new ConflictError('Ya existe una cuenta con ese correo.');
    }
    throw err;
  }
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
 * Impide que alguien actúe sobre su propia cuenta.
 *
 * Se aplica **sin excepción de rol**, incluido SUPERADMIN. Un superadmin
 * que se degrade o se elimine a sí mismo puede dejar la tienda sin nadie
 * capaz de administrarla, y recuperarlo exigiría tocar la base de datos a
 * mano. Es una de esas operaciones que conviene que la aplicación
 * simplemente no permita.
 */
export function assertNotActingOnSelf(actorId: string, targetId: string, action: string) {
  if (actorId === targetId) {
    throw new ForbiddenError(`No puedes ${action} tu propia cuenta.`);
  }
}

/** Listado para el panel. Sin `passwordHash`, gracias al `select`. */
export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
  });
}

/**
 * Un ADMIN solo gestiona cuentas USER; tocar a otro ADMIN o a un
 * SUPERADMIN queda reservado al SUPERADMIN.
 *
 * Sin esto, cualquier administrador podría degradar o eliminar a sus
 * pares, o escalar sus propios permisos a través de una cuenta ajena.
 *
 * Vive en una función propia, y no repetida en cada acción, para que
 * añadir una operación nueva sobre usuarios no pueda olvidarse la regla.
 */
export function assertCanManageTarget(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === 'ADMIN' && targetRole !== 'USER') {
    throw new ForbiddenError('Como Admin, solo puedes gestionar cuentas de Usuario.');
  }
}

/**
 * Edita una cuenta ajena desde el panel.
 *
 * El orden de las comprobaciones importa y no debe alterarse:
 *
 *   1. que el objetivo exista;
 *   2. que el actor tenga rango para gestionarlo;
 *   3. que solo un SUPERADMIN cambie roles, y nunca el suyo;
 *   4. y por último la escritura.
 *
 * Comprobar el rango antes que nada evita que un ADMIN pueda deducir, por
 * el mensaje de error, información sobre cuentas que no le competen.
 *
 * @param actorId Quien realiza la acción, tomado de la sesión.
 * @param actorRole Su rol, también de la sesión — nunca del cliente.
 */
export async function adminUpdateUser(
  actorId: string,
  actorRole: UserRole,
  targetId: string,
  input: { name: string; email: string; password?: string; role?: UserRole },
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

  const passwordHash = input.password ? await hash(input.password, BCRYPT_ROUNDS) : undefined;

  try {
    return await prisma.user.update({
      where: { id: targetId },
      data: {
        name: input.name,
        email: input.email,
        // Segunda barrera: aunque llegara un `role` desde un ADMIN, aquí
        // se descarta. `undefined` deja la columna intacta.
        role: actorRole === 'SUPERADMIN' ? input.role : undefined,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (err) {
    if (isUniqueViolation(err, 'email')) {
      throw new ConflictError('Ya existe una cuenta con ese correo.');
    }
    throw err;
  }
}

/**
 * Elimina una cuenta ajena.
 *
 * @throws {ValidationError} si el usuario tiene pedidos: el historial de
 *   compras tiene valor contable y debe sobrevivir a la cuenta.
 */
export async function adminDeleteUser(actorId: string, actorRole: UserRole, targetId: string) {
  assertNotActingOnSelf(actorId, targetId, 'eliminar');

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new ConflictError('Usuario no encontrado.');

  assertCanManageTarget(actorRole, target.role);

  // `Order.userId` es `onDelete: Restrict`, así que la base de datos ya
  // impediría el borrado. Se comprueba aquí igualmente para dar un motivo
  // entendible en vez de un error crudo de clave foránea.
  const orderCount = await prisma.order.count({ where: { userId: targetId } });
  if (orderCount > 0) {
    throw new ValidationError(
      `No se puede eliminar: tiene ${orderCount} pedido(s) asociado(s). El historial de compras debe conservarse.`,
    );
  }

  await prisma.user.delete({ where: { id: targetId } });
}
