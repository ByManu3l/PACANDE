import { AppError } from './errors';

/**
 * Uniform return shape for Server Actions, so exceptions never cross the
 * server/client boundary uncaught — the client always gets {success, ...}
 * to branch on instead of a thrown error it has to unwrap.
 */
export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail<T>(error: string): ActionResult<T> {
  return { success: false, error };
}

/** Runs a Server Action body, turning known AppErrors (and zod validation
 * errors) into a failed ActionResult instead of letting them throw.
 *
 * A message is shown to the user verbatim for AppError subclasses AND for
 * a *plain* `new Error('...')` — the shorthand used throughout actions/
 * for one-off validation messages (e.g. "Selecciona al menos una imagen.").
 * Anything else (TypeError, a Prisma error class, some other unexpected
 * exception) is logged and reported generically instead of leaking an
 * internal message to the client. Checking `err.constructor === Error`
 * rather than `instanceof Error` is what keeps that distinction — every
 * more specific error class fails the constructor check even though
 * `instanceof Error` would still be true for it. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof AppError || (err instanceof Error && err.constructor === Error)) {
      return fail(err.message);
    }
    console.error(err);
    return fail('Ocurrió un error inesperado. Intenta de nuevo.');
  }
}
