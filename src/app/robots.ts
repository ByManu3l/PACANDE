import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Reglas para rastreadores.
 *
 * Bloquea lo privado o específico de sesión. `/admin` y `/cuenta` ya están
 * protegidos por autenticación —esto no es un control de seguridad, sino
 * evitar que los buscadores gasten presupuesto de rastreo en URLs que solo
 * les devolverán una redirección a `/login`.
 *
 * `/carrito` y `/checkout` se excluyen porque su contenido depende de cada
 * visitante: indexarlos no tiene sentido y puede generar resultados
 * confusos.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/cuenta', '/carrito', '/checkout', '/api'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
