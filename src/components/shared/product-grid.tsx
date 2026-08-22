import { auth } from '@/lib/auth';
import { getWishlistedIds } from '@/lib/services/wishlist.service';
import { toProductCard } from '@/lib/utils/serialize';

import { ProductCard } from './product-card';

type ProductoDePrisma = Parameters<typeof toProductCard>[0];

interface ProductGridProps {
  products: ProductoDePrisma[];
  /** Precarga la imagen de la primera tarjeta (elemento LCP habitual). */
  prioritizeFirst?: boolean;
}

/**
 * Grilla de productos del escaparate.
 *
 * Existe para resolver **en un solo lugar** las dos cosas que toda grilla
 * necesita y que antes se repetían en cada página: serializar los
 * `Decimal` y averiguar qué productos están en favoritos.
 *
 * El estado de favoritos se resuelve aquí, con una consulta para toda la
 * grilla, y no dentro de cada tarjeta. Consultarlo por tarjeta serían 24
 * consultas por visita, el patrón N+1 clásico.
 *
 * Es un Server Component: la sesión se lee en el servidor y el navegador
 * recibe el resultado ya calculado, sin un parpadeo de corazones vacíos
 * que se rellenan al cargar.
 */
export async function ProductGrid({ products, prioritizeFirst = true }: ProductGridProps) {
  const session = await auth();
  const enFavoritos = session?.user
    ? await getWishlistedIds(
        session.user.id,
        products.map((p) => p.id),
      )
    : new Set<string>();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.slug}
          product={toProductCard(product)}
          priority={prioritizeFirst && index === 0}
          isWishlisted={enFavoritos.has(product.id)}
          isAuthenticated={Boolean(session?.user)}
        />
      ))}
    </div>
  );
}
