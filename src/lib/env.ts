// `server-only` convierte en error de compilación cualquier intento de
// importar este módulo desde un componente de cliente. Sin esta línea, el
// fallo sería silencioso y mucho peor: en el navegador `DATABASE_URL` no
// existe, la validación lanzaría, y la pantalla que revienta sería
// justamente la que debía mostrar el error.
import 'server-only';
import { z } from 'zod';

/**
 * Validación de las variables de entorno, en el arranque.
 *
 * **Por qué existe:** sin esto, un `.env` incompleto no falla al iniciar
 * la aplicación — falla más tarde, en una petición cualquiera, con un
 * error que no dice qué falta. El caso real es desplegar sin
 * `AUTH_SECRET` y descubrirlo cuando el primer cliente intenta entrar.
 *
 * Aquí el arranque se detiene con un mensaje que nombra cada variable que
 * falta o está mal. Es la diferencia entre un despliegue que no sale y un
 * despliegue que sale roto.
 *
 * **Cómo añadir una variable nueva:**
 *   1. Declárala en el esquema de abajo, con su regla.
 *   2. Añádela a `.env.example` con un comentario que explique para qué
 *      es y de dónde se saca su valor.
 *   3. Si es de servidor, impórtala desde aquí (`env.LO_QUE_SEA`) y no
 *      desde `process.env`.
 */

/**
 * Variables de servidor. Nunca llegan al navegador.
 *
 * `NEXT_PUBLIC_SITE_URL` sí es pública (ver más abajo el porqué de la
 * separación), pero se valida en el mismo sitio para que exista una sola
 * lista de lo que la aplicación necesita.
 */
const serverSchema = z.object({
  /**
   * Cadena de conexión de PostgreSQL.
   *
   * Se comprueba el prefijo además del formato de URL: un valor como
   * `mysql://…` es sintácticamente válido pero no funciona con el
   * adaptador de este proyecto, y vale más decirlo aquí que dejar que
   * falle en la primera consulta.
   */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL es obligatoria.')
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL debe ser una cadena de conexión de PostgreSQL (postgresql://…).',
    ),

  /**
   * Clave de firma de las sesiones.
   *
   * El mínimo de 32 caracteres no es arbitrario: por debajo de eso la
   * clave es corta para HS256 y una sesión se puede falsificar por fuerza
   * bruta. Además se rechaza explícitamente el valor de ejemplo del
   * `.env.example`, que es el error más fácil de cometer al desplegar por
   * primera vez.
   */
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET debe tener al menos 32 caracteres. Genera uno con: npx auth secret')
    .refine(
      (value) => !value.includes('reemplaza-esto'),
      'AUTH_SECRET sigue siendo el valor de ejemplo. Genera uno propio con: npx auth secret',
    ),

  /** URL base para las rutas de retorno de Auth.js. */
  AUTH_URL: z.url('AUTH_URL debe ser una URL completa, p. ej. https://mitienda.com'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Variables públicas: se incrustan en el JavaScript que se envía al
 * navegador, así que **nunca** pongas aquí nada secreto. El prefijo
 * `NEXT_PUBLIC_` es lo que le indica eso a Next.js.
 *
 * Se declaran una a una y no con un bucle sobre `process.env` porque el
 * compilador sustituye estas referencias por su valor literal: tienen que
 * aparecer escritas tal cual en el código para que la sustitución ocurra.
 */
const clientSchema = z.object({
  /**
   * Dominio público del sitio. Lo usan el sitemap, `robots.txt` y las
   * URLs absolutas de Open Graph.
   *
   * Si queda en `localhost` en producción, el sitemap publica direcciones
   * que no existen y las miniaturas al compartir un producto no cargan.
   * No se puede validar que sea *el* dominio correcto, pero sí que sea
   * una URL bien formada.
   */
  NEXT_PUBLIC_SITE_URL: z.url(
    'NEXT_PUBLIC_SITE_URL debe ser una URL completa, p. ej. https://mitienda.com',
  ),
});

const schema = serverSchema.extend(clientSchema.shape);

function parseEnv() {
  const result = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (result.success) return result.data;

  // Se listan **todos** los problemas, no solo el primero: quien despliega
  // por primera vez suele tener varias variables sin poner, y descubrirlas
  // de una en una es una cadena de despliegues fallidos.
  const problemas = result.error.issues
    .map((issue) => `  · ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `\nNo se puede arrancar: hay variables de entorno sin configurar o inválidas.\n\n` +
      `${problemas}\n\n` +
      `Revisa tu archivo .env. La plantilla está en .env.example.\n`,
  );
}

/**
 * Variables validadas y tipadas.
 *
 * Úsala en lugar de `process.env`: aquí los valores están comprobados y
 * TypeScript conoce sus tipos, así que un nombre mal escrito es un error
 * de compilación en vez de un `undefined` silencioso.
 */
export const env = parseEnv();
