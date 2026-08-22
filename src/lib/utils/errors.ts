/**
 * Errores de dominio.
 *
 * Los lanzan los servicios (`lib/services/*`) y los traduce
 * `withActionResult` (`lib/utils/action-result.ts`) al `{ ok: false,
 * error }` que reciben los formularios.
 *
 * **Por qué existe esta clase base:** `withActionResult` necesita
 * distinguir un error *previsto* — "no hay stock", "correo ya
 * registrado" — de un fallo inesperado. El mensaje de un `AppError` se le
 * muestra tal cual al usuario; el de cualquier otro error se registra en
 * el servidor y se reemplaza por un texto genérico, para no filtrar
 * detalles internos (rutas, SQL, nombres de tablas) en la interfaz.
 *
 * Es decir: **si escribes el mensaje pensando en que lo lea una persona,
 * lanza un `AppError`.** Si no, deja que se propague.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** El recurso pedido no existe. Las páginas lo convierten en un 404. */
export class NotFoundError extends AppError {}

/** Hay sesión, pero ese usuario no tiene permiso. Lo lanza `requireRole`. */
export class ForbiddenError extends AppError {}

/** No hay sesión. Lo lanza `requireSession`. */
export class UnauthorizedError extends AppError {}

/** Los datos no cumplen una regla de negocio (stock insuficiente, etc.). */
export class ValidationError extends AppError {}

/** Choca con algo que ya existe (correo o slug duplicado). */
export class ConflictError extends AppError {}

/**
 * ¿Es este error una violación de índice único de Postgres (P2002)?
 *
 * **Por qué hace falta:** comprobar primero si el slug existe y crear
 * después deja una ventana entre las dos consultas en la que otra
 * petición puede insertar ese mismo slug. Ese hueco no se cierra con más
 * comprobaciones — solo lo cierra el índice único de la base de datos. El
 * patrón correcto es entonces *intentar* la escritura y traducir el fallo
 * del índice a un mensaje entendible.
 *
 * Se identifica por el campo `code` y no con `instanceof` porque el
 * generador `prisma-client` no expone las clases de error en un punto de
 * importación estable entre versiones.
 *
 * **Cuidado al actualizar Prisma:** de dónde se saca la columna en
 * conflicto depende de cómo se conecte el cliente. Con el motor binario
 * clásico viene en `meta.target`; con los *driver adapters* de Prisma 7
 * —que es lo que usa este proyecto— `meta.target` no existe y la lista
 * llega dentro del error del driver. Se leen las dos formas para que
 * cambiar de estrategia de conexión no rompa la detección en silencio.
 * Verificado contra Prisma 7.9 + `@prisma/adapter-pg`.
 *
 * @param field Si se indica, solo devuelve `true` cuando el conflicto es
 *   de esa columna. Útil en tablas con varios índices únicos, donde cada
 *   uno merece un mensaje distinto.
 */
export function isUniqueViolation(err: unknown, field?: string): boolean {
  if (!isRecord(err) || err.code !== 'P2002') return false;
  if (!field) return true;

  return conflictingFields(err).includes(field);
}

/** Columnas en conflicto, leídas de las dos formas posibles (ver arriba). */
function conflictingFields(err: Record<string, unknown>): string[] {
  const meta = isRecord(err.meta) ? err.meta : undefined;
  if (!meta) return [];

  // Forma clásica (motor binario): meta.target.
  if (Array.isArray(meta.target)) return meta.target.filter((t) => typeof t === 'string');
  // Algunas versiones lo entregan como el nombre del índice, p. ej.
  // "Category_slug_key", del que se puede extraer la columna.
  if (typeof meta.target === 'string') return meta.target.split('_');

  // Forma de driver adapter: meta.driverAdapterError.cause.constraint.fields.
  const adapterError = isRecord(meta.driverAdapterError) ? meta.driverAdapterError : undefined;
  const cause = adapterError && isRecord(adapterError.cause) ? adapterError.cause : undefined;
  const constraint = cause && isRecord(cause.constraint) ? cause.constraint : undefined;

  if (constraint && Array.isArray(constraint.fields)) {
    return constraint.fields.filter((f): f is string => typeof f === 'string');
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
