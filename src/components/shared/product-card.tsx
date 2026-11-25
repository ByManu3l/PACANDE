import Image from 'next/image';
import Link from 'next/link';

import { Price } from '@/components/shared/price';
import { QuickAddButton } from '@/components/shared/quick-add-button';
import { RatingStars } from '@/components/shared/rating-stars';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { formatPrice } from '@/lib/utils/currency';
import { precioConDescuento, tieneDescuento } from '@/lib/utils/discount';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    description?: string;
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

/**
 * Tarjeta de producto de la versión original: blanca, de esquinas rectas,
 * todo centrado; estrella de favorito arriba a la izquierda, etiqueta roja
 * de descuento arriba a la derecha, la foto entera sobre gris claro, y los
 * dos botones rojos apilados —«Comprar Ahora» y «Agregar al Carrito»—.
 *
 * La foto y el nombre enlazan a la ficha; los botones quedan fuera del
 * enlace porque un `<button>` dentro de un `<a>` es HTML inválido.
 */
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
    <article className="group relative flex h-full flex-col overflow-hidden border border-[#e0e0e0] bg-white p-5 text-center shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-[1.03]">
      <WishlistButton
        productId={product.id}
        initialWishlisted={isWishlisted}
        isAuthenticated={isAuthenticated}
      />

      {!agotado && enOferta && (
        <span className="bg-primary absolute top-2.5 right-2.5 z-[2] rounded-[5px] px-2.5 py-[5px] text-[0.9rem] font-bold text-white">
          {descuento}% OFF
        </span>
      )}

      {product.isFeatured && !agotado && !enOferta && (
        <span className="absolute top-2.5 right-2.5 z-[2] rounded-[5px] bg-black px-2.5 py-[5px] text-[0.8rem] font-bold text-white">
          Destacado
        </span>
      )}

      <Link href={`/producto/${product.slug}`} className="block focus-visible:outline-none">
        <div className="relative mb-2.5 aspect-square overflow-hidden rounded-lg bg-[#f5f5f5]">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              priority={priority}
              sizes="(min-width: 960px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-contain p-2.5 transition-transform duration-300 hover:scale-110"
            />
          ) : null}

          {agotado && (
            // Un velo sobre la imagen, y no solo una etiqueta: de un
            // vistazo hay que poder saltarse los agotados en una grilla.
            <div className="absolute inset-0 grid place-items-center bg-white/60">
              <span className="bg-black px-3 py-1 text-sm font-bold text-white">Agotado</span>
            </div>
          )}
        </div>

        <h3 className="group-focus-within:text-primary mb-2.5 text-[1.2rem] leading-snug font-bold text-[#333]">
          {product.name}
        </h3>
      </Link>

      {product.description && (
        <p className="mb-2.5 line-clamp-2 text-[#666]">{product.description}</p>
      )}

      {/* Sin opiniones no se dibuja nada: cinco estrellas vacías en cada
          tarjeta de una tienda nueva parecen mala valoración. */}
      {product.ratingCount > 0 && (
        <div className="mb-2.5 flex justify-center">
          <RatingStars value={product.ratingAverage} count={product.ratingCount} size="sm" />
        </div>
      )}

      <p className="mb-2.5 flex flex-wrap items-baseline justify-center gap-2 text-[1.2rem] font-bold text-black">
        <Price amount={precioVigente.toString()} />
        {enOferta && (
          <span className="text-sm font-normal text-[#666] line-through">
            {formatPrice(product.price)}
          </span>
        )}
      </p>

      {/* Aviso de escasez: solo por debajo de 5 unidades, para que
          signifique algo cuando aparece. */}
      {!agotado && product.stock < 5 && (
        <p className="mb-2.5 text-sm font-medium text-amber-700">¡Solo quedan {product.stock}!</p>
      )}

      {/* `mt-auto` alinea los botones al pie en toda la fila aunque los
          nombres ocupen distinto número de líneas. */}
      <div className="mx-2 mt-auto flex flex-col gap-2.5 sm:mx-[10%] lg:mx-[15%]">
        <QuickAddButton
          productId={product.id}
          productName={product.name}
          stock={product.stock}
          modo="comprar"
        />
        <QuickAddButton productId={product.id} productName={product.name} stock={product.stock} />
      </div>
    </article>
  );
}
