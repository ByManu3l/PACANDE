import { PaginationNav } from '@/components/shared/pagination-nav';
import { ProductCard } from '@/components/shared/product-card';
import { searchProducts } from '@/lib/services/product.service';
import { parsePageParam } from '@/lib/utils/pagination';

export const metadata = {
  title: 'Buscar',
  // La página de resultados no aporta nada a un buscador y genera URLs
  // infinitas según el término consultado.
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<'/buscar'>) {
  const { q, page: pageParam } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  const page = parsePageParam(pageParam);

  const results = await searchProducts(query, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {query ? `Resultados para "${query}"` : 'Buscar productos'}
        </h1>
        {query && results.total > 0 && (
          <p className="text-muted-foreground mt-1 text-sm">
            {results.total} {results.total === 1 ? 'producto' : 'productos'}
          </p>
        )}
      </div>

      {query && results.total === 0 && (
        <p className="text-muted-foreground">
          No encontramos productos que coincidan. Prueba con otra palabra.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {results.items.map((product, index) => (
          <ProductCard
            key={product.slug}
            product={{ ...product, price: product.price.toString() }}
            priority={index === 0}
          />
        ))}
      </div>

      <PaginationNav
        page={results.page}
        pageCount={results.pageCount}
        basePath="/buscar"
        params={{ q: query }}
      />
    </div>
  );
}
