import Image from 'next/image';
import Link from 'next/link';

import { CategoryCard } from '@/components/shared/category-card';
import { ProductCard } from '@/components/shared/product-card';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/lib/config/site.config';
import { getTopLevelCategories } from '@/lib/services/category.service';
import { getFeaturedProducts } from '@/lib/services/product.service';

// Banner de ejemplo del catálogo semilla — al re-marcar la plantilla,
// reemplaza esta imagen (y el resto de public/images/brand/) por las tuyas.
const HERO_IMAGE = '/images/brand/carrusel-1.jpg';

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getTopLevelCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-xl">
        <div className="relative aspect-21/9 sm:aspect-3/1">
          <Image
            src={HERO_IMAGE}
            alt={siteConfig.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="absolute inset-0 flex flex-col items-start justify-center gap-4 p-6 sm:p-10">
          <h1 className="max-w-md text-3xl font-bold text-white sm:text-4xl">{siteConfig.name}</h1>
          <p className="max-w-md text-white/90">{siteConfig.description}</p>
          <Button render={<Link href="#categorias" />} nativeButton={false} size="lg">
            Explorar catálogo
          </Button>
        </div>
      </section>

      <section id="categorias" className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Categorías</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Destacados</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.slug}
                product={{ ...product, price: product.price.toString() }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
