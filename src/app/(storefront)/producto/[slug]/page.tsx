import { Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { getProductBySlug } from '@/lib/services/product.service';
import { formatPrice } from '@/lib/utils/currency';
import { NotFoundError } from '@/lib/utils/errors';

export default async function ProductPage({ params }: PageProps<'/producto/[slug]'>) {
  const { slug } = await params;

  const product = await getProductBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          )}
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {product.images.slice(1).map((image) => (
              <div
                key={image}
                className="bg-muted relative aspect-square overflow-hidden rounded-lg"
              >
                <Image src={image} alt={product.name} fill sizes="20vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Link
            href={`/categoria/${product.category.slug}`}
            className="text-muted-foreground text-sm hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        </div>

        <p className="text-primary text-3xl font-bold">{formatPrice(product.price.toString())}</p>

        {product.isFeatured && <Badge>Destacado</Badge>}

        <p className="text-muted-foreground">{product.description}</p>

        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Package className="size-4" />
          {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
        </p>

        {/* El botón de "Añadir al carrito" se conecta cuando el carrito
            persistido queda implementado. */}
      </div>
    </div>
  );
}
