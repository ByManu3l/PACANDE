import Image from 'next/image';
import Link from 'next/link';

import { Price } from '@/components/shared/price';
import { QuickAddButton } from '@/components/shared/quick-add-button';
import { RatingStars } from '@/components/shared/rating-stars';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils/currency';
import { precioConDescuento, tieneDescuento } from '@/lib/utils/discount';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number | string;
    images: string[];
    isFeatured: boolean;
    stock: number;
    discountPercent?: number;
    ratingAverage: number | string;
    ratingCount: number;
  };
  /**
   * Márcalo en la primera tarjeta de una grilla para que Next/Image la
   * precargue: suele ser el elemento LCP (Largest Contentful Paint) de las
   * páginas de categoría y búsqueda, y precargarlo mejora esa métrica.
   */
  priority?: boolean;
  /** Estado de favorito, resuelto para toda la grilla en una consulta. */
  isWishlisted?: boolean;
  isAuthenticated?: boolean;
}

export async function ProductCard({
  product,
  priority,
  isWishlisted = false,
  isAuthenticated = false,
}: ProductCardProps) {
  const image = product.images[0];
  const agotado = product.stock === 0;
  const descuento = product.discountPercent ?? 0;
  const enOferta = tieneDescuento(descuento);
  const precioVigente = enOferta ? precioConDescuento(product.price, descuento) : product.price;

  return (
    // `group` permite que la imagen reaccione al hover de toda la tarjeta,
    // no solo al suyo propio.
    <div className="group relative">
      <WishlistButton
        productId={product.id}
        initialWishlisted={isWishlisted}
        isAuthenticated={isAuthenticated}
      />

      <Link href={`/producto/${product.slug}`} className="block">
        <Card className="hover:border-primary/40 h-full gap-3 overflow-hidden py-0 transition-all duration-300 group-hover:scale-[1.03] hover:shadow-xl">
          <div className="bg-muted relative aspect-square overflow-hidden">
            {image ? (
              <Image
                src={image}
                alt={product.name}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : null}

            {/* La rebaja manda sobre «Destacado»: es el dato que decide una
                compra, y dos etiquetas en la misma esquina se estorban. */}
            {!agotado && enOferta && (
              <Badge className="absolute top-2 left-2 bg-red-600 font-bold text-white">
                −{descuento}%
              </Badge>
            )}

            {product.isFeatured && !agotado && !enOferta && (
              <Badge className="absolute top-2 left-2">Destacado</Badge>
            )}

            {agotado && (
              // Un velo sobre la imagen, y no solo una etiqueta: de un
              // vistazo hay que poder saltarse los agotados en una grilla.
              <div className="bg-background/60 absolute inset-0 grid place-items-center backdrop-blur-[1px]">
                <Badge variant="secondary">Agotado</Badge>
              </div>
            )}
          </div>

          <CardContent className="space-y-1.5 pb-4">
            <p className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</p>

            {/* Sin opiniones no se dibuja nada: cinco estrellas vacías en
                cada tarjeta de una tienda nueva parecen mala valoración. */}
            {product.ratingCount > 0 && (
              <RatingStars value={product.ratingAverage} count={product.ratingCount} size="sm" />
            )}

            <p className="flex flex-wrap items-baseline gap-2">
              <Price amount={precioVigente.toString()} />
              {enOferta && (
                <span className="text-muted-foreground text-xs line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </p>

            {/* Aviso de escasez: solo por debajo de 5 unidades, para que
                signifique algo cuando aparece. */}
            {!agotado && product.stock < 5 && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                ¡Solo quedan {product.stock}!
              </p>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Fuera del enlace a propósito: un botón dentro de un `<a>` es HTML
          inválido y acaba navegando al pulsarlo. */}
      <div className="mt-2">
        <QuickAddButton productId={product.id} productName={product.name} stock={product.stock} />
      </div>
    </div>
  );
}
