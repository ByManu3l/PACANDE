import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad, aplicadas a todas las respuestas.
 *
 * Son instrucciones al navegador sobre qué NO permitir. Cada una cierra
 * una vía de ataque concreta, y todas son de coste cero en tiempo de
 * ejecución.
 */
const securityHeaders = [
  {
    /**
     * Política de seguridad de contenido: la más importante de la lista.
     * Limita de dónde puede cargarse cada tipo de recurso, lo que
     * neutraliza la mayoría de los ataques de inyección de scripts —
     * aunque alguien logre insertar un `<script>`, el navegador se niega
     * a ejecutarlo si su origen no está permitido aquí.
     *
     * `'unsafe-inline'` y `'unsafe-eval'` en `script-src` son necesarios
     * para Next.js: el arranque de React inyecta scripts en línea y el
     * modo de desarrollo evalúa código para el refresco en caliente.
     * Endurecer esto exige generar un *nonce* por petición desde
     * `proxy.ts`; está documentado como ampliación en `docs/AUDITORIA.md`.
     *
     * `img-src` admite `data:` y `blob:` porque la vista previa de una
     * imagen recién subida usa una URL de ese tipo antes de guardarla.
     */
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      // Nadie puede incrustar esta tienda en un marco: es la defensa
      // contra el secuestro de clics, donde un sitio ajeno superpone
      // controles invisibles sobre los botones reales.
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      // Fuerza a que cualquier recurso pedido por http se pida por https.
      'upgrade-insecure-requests',
    ].join('; '),
  },
  {
    /**
     * Obliga al navegador a usar HTTPS durante dos años, incluso si
     * alguien escribe la dirección con http. Cierra la ventana en la que
     * una primera petición sin cifrar puede ser interceptada.
     *
     * Solo tiene efecto sobre HTTPS, así que en local es inocua.
     */
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    /**
     * Impide que el navegador adivine el tipo de un archivo por su
     * contenido. Sin esto, una imagen subida que en realidad contenga
     * JavaScript podría llegar a ejecutarse.
     */
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    /** Equivalente a `frame-ancestors`, para navegadores antiguos. */
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    /**
     * Al salir hacia otro sitio se envía solo el dominio, no la ruta
     * completa. Evita filtrar en el encabezado `Referer` direcciones que
     * incluyan números de pedido u otros identificadores.
     */
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    /**
     * Renuncia explícitamente a permisos que una tienda no necesita. Si
     * alguna vez se inyectara código de terceros, tampoco podría pedir la
     * cámara ni la ubicación.
     */
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  /**
   * `X-Powered-By: Next.js` no aporta nada al visitante y sí le dice a
   * quien busca objetivos qué tecnología —y qué vulnerabilidades
   * conocidas— probar primero.
   */
  poweredByHeader: false,

  /**
   * Las imágenes subidas desde el panel en el despliegue de Vercel viven
   * en Vercel Blob, en otro dominio. `next/image` solo optimiza imágenes
   * remotas de dominios declarados aquí.
   */
  images: {
    // 90 solo para los banners de portada: a todo el ancho, la compresión
    // por defecto (75) se nota en el texto de los banners.
    qualities: [75, 90],
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default nextConfig;
