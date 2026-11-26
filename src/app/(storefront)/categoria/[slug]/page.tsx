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

/**
 * Secciones cuyo banner deja libre el lado derecho (la foto de Ropa tiene
 * el perchero a la izquierda). En las demás, el texto va a la izquierda.
 */
const TEXTO_A_LA_DERECHA = new Set(['ropa']);

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

  // Categoría con subcategorías: el banner de la sección, con el título
  // sobre el lado vacío de la foto, y las tarjetas grandes de la página
  // «Ropa» original.
  if (hasChildren) {
    const textoDerecha = TEXTO_A_LA_DERECHA.has(category.slug);
    return (
      <div className="mx-auto max-w-[1200px] space-y-6">
        {/* Banner de la sección a todo el ancho y pegado a la cabecera, con
            la misma proporción que la portada (3,6:1). Las fotos vienen
            alargadas por su lado vacío para llenarla sin recortar productos. */}
        <header className="relative left-1/2 -mt-5 -ml-[50vw] min-h-[260px] w-screen overflow-hidden bg-black text-white sm:aspect-[18/5] sm:min-h-0">
          {category.image && (
            <Image
              src={category.image}
              alt=""
              fill
              priority
              quality={90}
              sizes="100vw"
              // En móvil la foto se recorta: se conserva el lado de los
              // productos, que es el contrario al del texto.
              className={textoDerecha ? 'object-cover object-left' : 'object-cover object-right'}
            />
          )}
          {/* En móvil el texto cae sobre la foto recortada: velo parejo. */}
          <div className="absolute inset-0 bg-black/45 sm:hidden" />
          {/* Sombra solo del lado del texto, para que se lea sin apagar
              los productos del otro lado. */}
          <div
            className={
              textoDerecha
                ? 'absolute inset-0 bg-linear-to-l from-black/70 via-black/30 to-transparent'
                : 'absolute inset-0 bg-linear-to-r from-black/70 via-black/30 to-transparent'
            }
          />
          {/* El texto se alinea con el contenido de la página, no con los
              bordes de la ventana. */}
          <div className="relative mx-auto h-full max-w-[1200px]">
            <div
              className={`flex h-full min-h-[260px] flex-col justify-center gap-4 p-8 sm:w-1/2 sm:p-12 ${
                textoDerecha ? 'ml-auto text-right' : ''
              }`}
            >
              <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[3px] uppercase [text-shadow:2px_2px_6px_rgba(0,0,0,0.6)] sm:text-[3.5rem] lg:text-[4.5rem]">
                {category.name}
              </h1>
              <span
                aria-hidden="true"
                className={`bg-brand block h-1 w-[60px] rounded-sm ${textoDerecha ? 'ml-auto' : ''}`}
              />
              {category.description && (
                <p
                  className={`max-w-[420px] text-base leading-relaxed text-white/90 sm:text-lg ${
                    textoDerecha ? 'ml-auto' : ''
                  }`}
                >
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </header>
        {migas}
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
