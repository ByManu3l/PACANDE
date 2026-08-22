import { ZodError } from 'zod';

import { AppError } from './errors';

/**
 * Forma de retorno uniforme de las Server Actions.
 *
 * Las excepciones nunca cruzan el límite servidor→cliente: quien llama
 * siempre recibe `{ success, ... }` sobre el que ramificar, en vez de una
 * promesa rechazada que tendría que envolver en try/catch.
 */
export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Constructores internos del resultado.
 *
 * No se exportan: `runAction` es la única forma prevista de producir un
 * `ActionResult`, y exponer estos dos invitaría a construirlo a mano
 * saltándose la traducción de errores.
 */
function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail<T>(error: string): ActionResult<T> {
  return { success: false, error };
}

/**
 * Ejecuta el cuerpo de una Server Action y traduce cualquier excepción a
 * un `ActionResult` fallido.
 *
 * Un mensaje llega al usuario tal cual en tres casos, que son los que el
 * código lanza a propósito:
 *
 * - `AppError` y sus subclases (`ValidationError`, `ForbiddenError`, …),
 *   la forma normal de reportar una regla de negocio incumplida.
 * - `ZodError`, de validar con `schema.parse()`. Se toma el mensaje del
 *   primer campo inválido, que es el que el formulario debe mostrar.
 * - `new Error('…')` a secas, el atajo para validaciones puntuales que no
 *   ameritan una clase propia (p. ej. "Selecciona al menos una imagen").
 *
 * Cualquier otra cosa — un `TypeError`, un error de Prisma, un fallo de
 * red — se registra en el servidor y al cliente se le devuelve un mensaje
 * genérico. Esos mensajes pueden contener nombres de tabla, rutas de
 * archivo o fragmentos de consulta, y no deben llegar al navegador.
 *
 * La distinción entre "Error lanzado a propósito" y "excepción inesperada
 * que hereda de Error" se hace con `err.constructor === Error`:
 * `instanceof Error` sería cierto para ambos, mientras que la
 * comprobación de constructor solo acepta la clase base exacta.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof ZodError) {
      return fail(err.issues[0]?.message ?? 'Datos inválidos.');
    }
    if (err instanceof AppError || (err instanceof Error && err.constructor === Error)) {
      return fail(err.message);
    }
    console.error(err);
    return fail('Ocurrió un error inesperado. Intenta de nuevo.');
  }
}
