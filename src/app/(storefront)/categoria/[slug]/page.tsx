import { notFound } from 'next/navigation';

import { CategoryCard } from '@/components/shared/category-card';
import { PaginationNav } from '@/components/shared/pagination-nav';
import { ProductCard } from '@/components/shared/product-card';
import { getCategoryBySlug, getCategoryProducts } from '@/lib/services/category.service';
import { NotFoundError } from '@/lib/utils/errors';
import { parsePageParam } from '@/lib/utils/pagination';

async function findCategory(slug: string) {
  return getCategoryBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
}

/** Metadatos por categoría. Ver la nota sobre deduplicación de consultas
 * en `producto/[slug]/page.tsx`. */
export async function generateMetadata({ params }: PageProps<'/categoria/[slug]'>) {
  const { slug } = await params;
  const category = await findCategory(slug);

  if (!category) return { title: 'Categoría no encontrada' };

  const description =
    category.description ?? `Explora nuestra selección de ${category.name.toLowerCase()}.`;

  return {
    title: category.name,
    description,
    openGraph: {
      title: category.name,
      description,
      images: category.image ? [{ url: category.image }] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<'/categoria/[slug]'>) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);

  if (!category) {
    notFound();
  }

  const hasChildren = category.children.length > 0;
  // Los productos solo se consultan si la categoría es hoja: una categoría
  // con subcategorías nunca los muestra, así que pedirlos sería una
  // consulta desperdiciada en cada visita.
  const products = hasChildren
    ? null
    : await getCategoryProducts(category.id, parsePageParam(pageParam));

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
      ) : products && products.total > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.items.map((product, index) => (
              <ProductCard
                key={product.slug}
                product={{ ...product, price: product.price.toString() }}
                priority={index === 0}
              />
            ))}
          </div>
          <PaginationNav
            page={products.page}
            pageCount={products.pageCount}
            basePath={`/categoria/${category.slug}`}
          />
        </>
      ) : (
        <p className="text-muted-foreground">Todavía no hay productos en esta categoría.</p>
      )}
    </div>
  );
}
