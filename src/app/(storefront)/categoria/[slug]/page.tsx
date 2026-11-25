import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { CategoryCard } from '@/components/shared/category-card';
import { PaginationNav } from '@/components/shared/pagination-nav';
import { ProductFiltersBar } from '@/components/shared/product-filters';
import { ProductGrid } from '@/components/shared/product-grid';
import { getCategoryBySlug, getCategoryProducts } from '@/lib/services/category.service';
import { NotFoundError } from '@/lib/utils/errors';
import { parsePageParam } from '@/lib/utils/pagination';
import { filtrosEnUrl, parseFilters } from '@/lib/utils/product-filters';

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
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);

  if (!category) {
    notFound();
  }

  const hasChildren = category.children.length > 0;
  // Los productos solo se consultan si la categoría es hoja: una categoría
  // con subcategorías nunca los muestra, así que pedirlos sería una
  // consulta desperdiciada en cada visita.
  const filters = parseFilters(sp);
  const products = hasChildren
    ? null
    : await getCategoryProducts(category.id, parsePageParam(sp.page), filters);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Inicio', href: '/' },
          ...(category.parent
            ? [{ label: category.parent.name, href: `/categoria/${category.parent.slug}` }]
            : []),
          { label: category.name },
        ]}
      />

      {/* Cabecera con la imagen de la categoría de fondo. Cuando no hay
          imagen se cae a un titular normal en vez de a un rectángulo gris:
          una categoría sin foto no debe ocupar media pantalla en balde. */}
      {category.image ? (
        <header className="relative overflow-hidden rounded-lg">
          <div className="relative aspect-4/1 min-h-40">
            <Image
              src={category.image}
              alt=""
              fill
              priority
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <h1 className="text-3xl font-bold tracking-wide text-white uppercase drop-shadow-lg sm:text-5xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mx-auto mt-2 max-w-2xl text-white/90 drop-shadow sm:text-lg">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </header>
      ) : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-1">{category.description}</p>
          )}
        </div>
      )}

      {hasChildren ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {category.children.map((child) => (
            <CategoryCard key={child.slug} category={child} />
          ))}
        </div>
      ) : products ? (
        <>
          <ProductFiltersBar
            basePath={`/categoria/${category.slug}`}
            searchParams={sp}
            filters={filters}
            total={products.total}
          />

          {products.total === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Ningún producto coincide con estos filtros. Prueba a ampliarlos.
            </p>
          ) : (
            <ProductGrid products={products.items} />
          )}
          <PaginationNav
            page={products.page}
            pageCount={products.pageCount}
            basePath={`/categoria/${category.slug}`}
            params={filtrosEnUrl(sp)}
          />
        </>
      ) : null}
    </div>
  );
}
