import 'server-only';

import { headers } from 'next/headers';

import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/utils/errors';

/**
 * Límite de intentos por ventana de tiempo.
 *
 * **Qué evita:** que alguien pruebe contraseñas en bucle contra el login,
 * o cree cuentas y pedidos de forma automatizada. Sin esto, adivinar una
 * contraseña débil es cuestión de dejar un script corriendo.
 *
 * **Lo que este módulo NO es:** protección contra denegación de servicio.
 * Eso se resuelve delante de la aplicación —en Vercel, Cloudflare o el
 * balanceador— porque para entonces la petición ya consumió recursos del
 * servidor. Esto protege *operaciones concretas*, no la infraestructura.
 *
 * **Limitación importante del almacén por defecto:** guarda el estado en
 * memoria del proceso. Con varias instancias —o en serverless, donde cada
 * invocación puede arrancar un proceso nuevo— cada una lleva su propia
 * cuenta y el límite efectivo se multiplica. Sigue siendo mucho mejor que
 * nada, y sustituirlo por Redis es implementar `RateLimitStore`.
 */

export interface RateLimitStore {
  /**
   * Registra un intento y devuelve cuántos van en la ventana actual.
   *
   * Cuenta e incremento van juntos a propósito: leer y después escribir
   * deja una ventana en la que varias peticiones simultáneas leen el mismo
   * número y ninguna llega al límite.
   */
  hit(key: string, windowMs: number): Promise<number>;

  /** Olvida los intentos de una clave. */
  reset(key: string): Promise<void>;
}

/** Estado en memoria del proceso. Ver la limitación explicada arriba. */
class MemoryStore implements RateLimitStore {
  private readonly counters = new Map<string, { count: number; expiresAt: number }>();

  async hit(key: string, windowMs: number): Promise<number> {
    const ahora = Date.now();
    const actual = this.counters.get(key);

    if (!actual || actual.expiresAt <= ahora) {
      this.counters.set(key, { count: 1, expiresAt: ahora + windowMs });
      this.limpiar(ahora);
      return 1;
    }

    actual.count += 1;
    return actual.count;
  }

  async reset(key: string): Promise<void> {
    this.counters.delete(key);
  }

  /**
   * Descarta las entradas vencidas.
   *
   * Sin esta limpieza el mapa crece sin tope —una entrada por cada
   * dirección que haya intentado entrar alguna vez— y acaba siendo una
   * fuga de memoria. Se ejecuta al crear una ventana nueva, no con un
   * temporizador, para no dejar un intervalo activo indefinidamente.
   */
  private limpiar(ahora: number) {
    if (this.counters.size < 1000) return;
    for (const [key, valor] of this.counters) {
      if (valor.expiresAt <= ahora) this.counters.delete(key);
    }
  }
}

/** Sustitúyelo por una implementación con Redis en despliegues con varias instancias. */
export const rateLimitStore: RateLimitStore = new MemoryStore();

export interface RateLimitRule {
  /** Intentos permitidos dentro de la ventana. */
  limit: number;
  windowMs: number;
  /** Mensaje que ve quien excede el límite. */
  message: string;
}

const MINUTO = 60_000;

/**
 * Reglas por operación.
 *
 * Los números no son arbitrarios: tienen que estorbar a un script sin
 * estorbar a una persona. Cinco intentos de acceso en quince minutos cubre
 * de sobra a quien no recuerda cuál de sus contraseñas usó, y reduce un
 * ataque de diccionario a veinte intentos por hora.
 */
export const RATE_LIMITS = {
  login: {
    limit: 5,
    windowMs: 15 * MINUTO,
    message: 'Demasiados intentos de acceso. Espera unos minutos e inténtalo de nuevo.',
  },
  register: {
    limit: 3,
    windowMs: 60 * MINUTO,
    message: 'Demasiadas cuentas creadas desde esta conexión. Inténtalo más tarde.',
  },
  checkout: {
    limit: 10,
    windowMs: 10 * MINUTO,
    message: 'Demasiados intentos de compra seguidos. Espera un momento.',
  },
  // Cada consulta al asistente cuesta dinero real en la API de Claude: el
  // límite evita que un script vacíe el saldo. Veinte en diez minutos son
  // de sobra para una conversación de compra.
  asistente: {
    limit: 20,
    windowMs: 10 * MINUTO,
    message: 'El asistente recibió muchas consultas seguidas. Espera unos minutos.',
  },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Identifica al solicitante por su dirección IP.
 *
 * Se lee de las cabeceras que pone el proxy inverso. **Estas cabeceras
 * las puede falsificar el cliente si nada las sobrescribe**, así que esto
 * solo es fiable detrás de un proxy que las fije —Vercel, Cloudflare,
 * nginx bien configurado—, que es el caso de cualquier despliegue real.
 *
 * De `x-forwarded-for` se toma la primera dirección: es la del cliente
 * original; las siguientes son los proxies intermedios.
 *
 * Sin cabecera se devuelve una clave común, de modo que el límite se
 * aplique igualmente en vez de dejar pasar todo.
 */
async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'desconocido';
}

/**
 * Aplica una regla. Lánzalo al principio de la operación protegida.
 *
 * @param rule Una entrada de `RATE_LIMITS`.
 * @param scope Nombre de la operación; separa los contadores entre sí para
 *   que agotar los intentos de acceso no bloquee también el registro.
 * @param discriminator Identificador adicional opcional, como el correo
 *   introducido. Combinado con la IP, impide que alguien en una red
 *   compartida bloquee a los demás.
 * @throws {ValidationError} al superar el límite. `runAction` lo convierte
 *   en el mensaje que ve el usuario.
 */
async function rateLimitKey(scope: string, discriminator?: string): Promise<string> {
  return [scope, await clientKey(), discriminator ?? ''].join(':');
}

export async function enforceRateLimit(
  rule: RateLimitRule,
  scope: string,
  discriminator?: string,
): Promise<void> {
  const key = await rateLimitKey(scope, discriminator);
  const intentos = await rateLimitStore.hit(key, rule.windowMs);

  if (intentos > rule.limit) {
    // Se registra porque una ráfaga de estos es la señal temprana de un
    // ataque de fuerza bruta. El identificador va troceado a propósito:
    // basta para correlacionar, sin dejar direcciones IP completas en los
    // registros.
    logger.warn('Límite de intentos superado', { scope, intentos, limite: rule.limit });
    throw new ValidationError(rule.message);
  }
}

/**
 * Reinicia el contador tras una operación que salió bien.
 *
 * Se usa después de un inicio de sesión correcto: así el límite cuenta
 * solo **fallos seguidos**, que es lo que delata a quien prueba
 * contraseñas. Sin esto, alguien que entra y sale varias veces —por
 * ejemplo al enseñar la tienda alternando entre cuentas— acabaría
 * bloqueado sin haberse equivocado nunca.
 */
export async function resetRateLimit(scope: string, discriminator?: string): Promise<void> {
  await rateLimitStore.reset(await rateLimitKey(scope, discriminator));
}
