import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils/currency';

interface ProductCardProps {
  product: {
    slug: string;
    name: string;
    price: number | string;
    images: string[];
    isFeatured: boolean;
    stock: number;
  };
  /** Set for the first card in a grid so Next/Image can preload it — it's
   * typically the Largest Contentful Paint element on category/search pages. */
  priority?: boolean;
}

export function ProductCard({ product, priority }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Link href={`/producto/${product.slug}`}>
      <Card className="h-full gap-3 overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="bg-muted relative aspect-square">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          ) : null}
          {product.isFeatured && <Badge className="absolute top-2 left-2">Destacado</Badge>}
          {product.stock === 0 && (
            <Badge variant="secondary" className="absolute top-2 right-2">
              Agotado
            </Badge>
          )}
        </div>
        <CardContent className="space-y-1 pb-4">
          <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
          <p className="text-primary font-semibold">{formatPrice(product.price)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
