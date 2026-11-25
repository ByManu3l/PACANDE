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

  const migas = (
    <Breadcrumbs
      items={[
        { label: 'Inicio', href: '/' },
        ...(category.parent
          ? [{ label: category.parent.name, href: `/categoria/${category.parent.slug}` }]
          : []),
        { label: category.name },
      ]}
    />
  );

  // Categoría con subcategorías: el título centrado con la raya roja y
  // las tarjetas grandes de la página «Ropa» original.
  if (hasChildren) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6">
        {migas}
        <h1 className="mb-10 text-center text-[2.5em] leading-tight font-semibold text-[#2c3e50] after:mx-auto after:mt-2.5 after:block after:h-1 after:w-[60px] after:rounded-sm after:bg-linear-to-r after:from-[#ff0000] after:to-[#ff4444] after:content-['']">
          {category.name}
        </h1>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[30px]">
          {category.children.map((child) => (
            <CategoryCard key={child.slug} category={child} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {migas}

      {/* Cabecera de la subcategoría: la foto de fondo con velo, el nombre
          enorme en mayúsculas y la descripción debajo, como «Ropa Mujer»
          en la versión original. Sin imagen queda el mismo bloque sobre
          negro en vez de un rectángulo gris. */}
      <header className="relative overflow-hidden rounded-[15px] bg-black px-5 py-[60px] text-center text-white shadow-[0_4px_25px_rgba(0,0,0,0.15)]">
        {category.image && (
          <>
            <Image
              src={category.image}
              alt=""
              fill
              priority
              sizes="(min-width: 1400px) 1400px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}
        <div className="relative">
          <h1 className="mb-5 text-[2.5rem] leading-tight font-extrabold tracking-[3px] text-white uppercase [text-shadow:3px_3px_6px_rgba(0,0,0,0.7)] sm:text-[3.5rem] lg:text-[5rem]">
            {category.parent ? `${category.parent.name} ${category.name}` : category.name}
          </h1>
          {category.description && (
            <p className="mx-auto max-w-[800px] text-[1.2rem] leading-relaxed font-medium [text-shadow:2px_2px_4px_rgba(0,0,0,0.7)] sm:text-[1.5rem] lg:text-[1.8rem]">
              {category.description}
            </p>
          )}
        </div>
      </header>

      {products && (
        <div className="mb-10 space-y-6 rounded-[15px] bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] sm:p-[30px]">
          <ProductFiltersBar
            basePath={`/categoria/${category.slug}`}
            searchParams={sp}
            filters={filters}
            total={products.total}
          />

          {products.total === 0 ? (
            <p className="py-8 text-center text-[#666]">
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
        </div>
      )}
    </div>
  );
}
