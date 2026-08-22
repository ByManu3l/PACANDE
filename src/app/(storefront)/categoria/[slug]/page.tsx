import { notFound } from 'next/navigation';

import { CategoryCard } from '@/components/shared/category-card';
import { ProductCard } from '@/components/shared/product-card';
import { getCategoryBySlug } from '@/lib/services/category.service';
import { NotFoundError } from '@/lib/utils/errors';

export default async function CategoryPage({ params }: PageProps<'/categoria/[slug]'>) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });

  if (!category) {
    notFound();
  }

  const hasChildren = category.children.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-1">{category.description}</p>
        )}
      </div>

      {hasChildren ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {category.children.map((child) => (
            <CategoryCard key={child.slug} category={child} />
          ))}
        </div>
      ) : category.products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {category.products.map((product, index) => (
            <ProductCard
              key={product.slug}
              product={{ ...product, price: product.price.toString() }}
              priority={index === 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Todavía no hay productos en esta categoría.</p>
      )}
    </div>
  );
}
