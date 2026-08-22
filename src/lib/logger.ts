import { env } from '@/lib/env';

/**
 * Registro estructurado.
 *
 * **Por qué no `console.error` a secas:** en producción los registros los
 * lee una máquina, no una persona. Un `console.error(err)` produce texto
 * suelto que no se puede filtrar por gravedad, agrupar por tipo ni
 * relacionar con la petición que lo originó. Cuando un cliente dice «no
 * pude pagar ayer por la tarde», la diferencia entre encontrar el error en
 * un minuto o no encontrarlo es exactamente esta.
 *
 * **Este módulo no envía nada a ningún servicio externo.** Define el punto
 * de enganche, igual que `PaymentProvider` y `StorageAdapter`. Conectar
 * Sentry, Axiom o Better Stack es implementar `LogTransport` y cambiar la
 * última línea del archivo. Ver `docs/PERSONALIZACION.md`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Datos adicionales del evento. Pares clave-valor, no texto libre. */
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  level: LogLevel;
  message: string;
  /** ISO 8601. Facilita ordenar y filtrar por rango en cualquier visor. */
  timestamp: string;
  context?: LogContext;
  /** Presente solo en `error`, ya reducido a datos serializables. */
  error?: { name: string; message: string; stack?: string };
}

/**
 * Destino de los registros. Implementa esto para enviar a un servicio.
 *
 * Debe ser **infalible**: si el destino falla, no puede tumbar la
 * operación que lo llamó. Un registro perdido es un contratiempo; una
 * compra perdida por un fallo al registrar es inaceptable.
 */
export interface LogTransport {
  write(entry: LogEntry): void;
}

/**
 * Umbral de gravedad. En producción se descarta `debug` para no llenar el
 * almacenamiento con ruido que nadie va a leer.
 */
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * Claves cuyo valor nunca debe escribirse.
 *
 * No es paranoia: los registros se almacenan, se replican y a menudo se
 * consultan desde un panel de terceros. Una contraseña que llega ahí por
 * accidente queda expuesta en todos esos sitios a la vez, y no se puede
 * retirar. El filtro es por nombre de clave, no por valor, porque es lo
 * único que se puede comprobar de forma fiable.
 */
const CLAVES_SENSIBLES = [
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'secret',
  'authorization',
  'cookie',
  'cardnumber',
  'cardcvv',
  'cvv',
];

function redactar(context: LogContext): LogContext {
  const salida: LogContext = {};

  for (const [clave, valor] of Object.entries(context)) {
    if (CLAVES_SENSIBLES.includes(clave.toLowerCase())) {
      salida[clave] = '[oculto]';
    } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      salida[clave] = redactar(valor as LogContext);
    } else {
      salida[clave] = valor;
    }
  }

  return salida;
}

/**
 * Destino por defecto: la consola.
 *
 * En desarrollo escribe una línea legible; en producción, JSON en una sola
 * línea, que es lo que esperan Vercel, Datadog y cualquier recolector de
 * registros. Un objeto multilínea se parte en varias entradas y deja de
 * poder consultarse como una sola.
 */
class ConsoleTransport implements LogTransport {
  write(entry: LogEntry): void {
    if (env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
      return;
    }

    const partes = [`[${entry.level.toUpperCase()}]`, entry.message];
    if (entry.context && Object.keys(entry.context).length > 0) {
      partes.push(JSON.stringify(entry.context));
    }
    console.log(partes.join(' '));
    if (entry.error?.stack) console.log(entry.error.stack);
  }
}

function serializarError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // El rastro de pila no se envía en producción: puede contener rutas
      // del servidor y fragmentos de código. Un servicio de seguimiento de
      // errores sí debe recibirlo, pero por su propio canal.
      stack: env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }
  return { name: 'DesconocidoNoError', message: String(error) };
}

function crearLogger(transport: LogTransport) {
  function escribir(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context: redactar(context) } : {}),
      ...(error !== undefined ? { error: serializarError(error) } : {}),
    };

    try {
      transport.write(entry);
    } catch {
      // Un destino que falla nunca puede tumbar la operación que lo llamó.
      // Se ignora en silencio a propósito: intentar registrar el fallo de
      // registro es la forma más directa de provocar un bucle infinito.
    }
  }

  return {
    debug: (message: string, context?: LogContext) => escribir('debug', message, context),
    info: (message: string, context?: LogContext) => escribir('info', message, context),
    warn: (message: string, context?: LogContext) => escribir('warn', message, context),
    /**
     * @param error La excepción capturada. Se serializa a datos planos;
     *   no hace falta convertirla antes.
     */
    error: (message: string, error?: unknown, context?: LogContext) =>
      escribir('error', message, context, error),
  };
}

/**
 * Registro de la aplicación.
 *
 * Para enviar a un servicio externo, sustituye `new ConsoleTransport()`
 * por tu implementación de `LogTransport`. Es el único cambio necesario.
 */
export const logger = crearLogger(new ConsoleTransport());
