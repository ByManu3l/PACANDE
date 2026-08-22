import { Package, Truck, Undo2 } from 'lucide-react';
import { notFound } from 'next/navigation';

import { AddToCartButton } from '@/components/shared/add-to-cart-button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ProductGallery } from '@/components/shared/product-gallery';
import { ProductGrid } from '@/components/shared/product-grid';
import { RatingStars } from '@/components/shared/rating-stars';
import { ReviewSection } from '@/components/shared/review-section';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';
import { siteConfig } from '@/lib/config/site.config';
import { env } from '@/lib/env';
import { getProductBySlug, getRelatedProducts } from '@/lib/services/product.service';
import { getWishlistedIds } from '@/lib/services/wishlist.service';
import { formatPrice } from '@/lib/utils/currency';
import { NotFoundError } from '@/lib/utils/errors';

/** Igual que en la página: devuelve `null` en vez de propagar cuando el
 * producto no existe, para que `generateMetadata` no reviente en un 404. */
async function findProduct(slug: string) {
  return getProductBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
}

/**
 * Metadatos por producto: es lo que Google indexa y lo que se muestra al
 * compartir el enlace en WhatsApp o redes. Sin esto, todas las fichas de
 * producto comparten el título genérico del sitio y son indistinguibles
 * para un buscador.
 *
 * Next.js deduplica la consulta entre `generateMetadata` y el componente,
 * así que llamar dos veces a `findProduct` no significa dos viajes a la
 * base de datos en la misma petición.
 */
export async function generateMetadata({ params }: PageProps<'/producto/[slug]'>) {
  const { slug } = await params;
  const product = await findProduct(slug);

  if (!product) return { title: 'Producto no encontrado' };

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      type: 'website' as const,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<'/producto/[slug]'>) {
  const { slug } = await params;
  const product = await findProduct(slug);

  if (!product) {
    notFound();
  }

  const [session, relacionados] = await Promise.all([
    auth(),
    getRelatedProducts(product.categoryId, product.id),
  ]);

  const enFavoritos = session?.user
    ? await getWishlistedIds(session.user.id, [product.id])
    : new Set<string>();

  const agotado = product.stock === 0;

  return (
    <div className="space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Inicio', href: '/' },
          ...(product.category.parent
            ? [
                {
                  label: product.category.parent.name,
                  href: `/categoria/${product.category.parent.slug}`,
                },
              ]
            : []),
          { label: product.category.name, href: `/categoria/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>

            {product.ratingCount > 0 && (
              // Ancla a las opiniones: quien mira la nota quiere leerlas.
              <a href="#opiniones" className="inline-flex hover:underline">
                <RatingStars value={product.ratingAverage.toString()} count={product.ratingCount} />
              </a>
            )}
          </div>

          <p className="text-primary text-3xl font-bold">{formatPrice(product.price.toString())}</p>

          {product.isFeatured && !agotado && <Badge>Destacado</Badge>}

          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </p>

          <p
            className={
              agotado
                ? 'flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400'
                : 'text-muted-foreground flex items-center gap-2 text-sm'
            }
          >
            <Package className="size-4" />
            {agotado
              ? 'Agotado por ahora'
              : product.stock < 5
                ? `¡Solo quedan ${product.stock} unidades!`
                : `${product.stock} disponibles`}
          </p>

          <div className="flex flex-wrap gap-3">
            <AddToCartButton productId={product.id} stock={product.stock} />
            <WishlistButton
              productId={product.id}
              initialWishlisted={enFavoritos.has(product.id)}
              isAuthenticated={Boolean(session?.user)}
              variant="full"
            />
          </div>

          {/* Señales de confianza junto al botón de compra: es el momento
              exacto en que surgen las dudas que frenan una venta. */}
          <ul className="text-muted-foreground grid gap-2 border-t pt-4 text-sm">
            <li className="flex items-center gap-2">
              <Truck className="size-4 shrink-0" />
              Envío a todo el país
            </li>
            <li className="flex items-center gap-2">
              <Undo2 className="size-4 shrink-0" />
              Devoluciones dentro de los 30 días
            </li>
          </ul>
        </div>
      </div>

      <ReviewSection
        productId={product.id}
        productName={product.name}
        ratingAverage={product.ratingAverage.toString()}
        ratingCount={product.ratingCount}
      />

      {relacionados.length > 0 && (
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold tracking-tight">También te puede interesar</h2>
          <ProductGrid products={relacionados} prioritizeFirst={false} />
        </section>
      )}

      <ProductJsonLd product={product} />
    </div>
  );
}

/**
 * Datos estructurados de schema.org.
 *
 * Es lo que permite a Google mostrar precio, disponibilidad y estrellas
 * directamente en los resultados de búsqueda, en lugar de solo un título
 * y una descripción. En comercio electrónico ese bloque enriquecido es la
 * diferencia entre que alguien haga clic en tu resultado o en el de al
 * lado, y no cuesta nada más que este JSON.
 *
 * `aggregateRating` solo se incluye si hay opiniones: declararlo con cero
 * reseñas incumple las directrices de Google y puede penalizar la ficha.
 */
function ProductJsonLd({ product }: { product: Awaited<ReturnType<typeof getProductBySlug>> }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((img) => `${env.NEXT_PUBLIC_SITE_URL}${img}`),
    category: product.category.name,
    offers: {
      '@type': 'Offer',
      url: `${env.NEXT_PUBLIC_SITE_URL}/producto/${product.slug}`,
      price: product.price.toString(),
      priceCurrency: siteConfig.defaultCurrency,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAverage.toString(),
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // El contenido es JSON generado por nosotros a partir de datos de la
      // base, no entrada directa del usuario, y `JSON.stringify` escapa lo
      // necesario. Es la forma que documenta Next.js para JSON-LD.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
