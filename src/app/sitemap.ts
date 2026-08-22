import type { MetadataRoute } from 'next';

import { listActiveCategorySlugs } from '@/lib/services/category.service';
import { listActiveProductSlugs } from '@/lib/services/product.service';

/** URL pública del sitio. En local no importa; en despliegue debe apuntar
 * al dominio real o el sitemap listará URLs que no existen. */
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Sitemap con las rutas indexables: estáticas, categorías activas y
 * productos activos.
 *
 * Deliberadamente **no** incluye `/carrito`, `/checkout`, `/cuenta/**` ni
 * `/admin/**`: son privadas o específicas de cada sesión y no aportan
 * nada a un buscador. `robots.ts` además las bloquea explícitamente.
 *
 * Consulta solo `slug` y `updatedAt` — traer las filas completas para
 * generar una lista de URLs sería desperdiciar ancho de banda de base de
 * datos en cada rastreo.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    listActiveCategorySlugs(),
    listActiveProductSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/ayuda`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contacto`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terminos`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${baseUrl}/privacidad`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((c) => ({
      url: `${baseUrl}/categoria/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${baseUrl}/producto/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
