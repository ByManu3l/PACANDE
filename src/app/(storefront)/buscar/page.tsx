import { PaginationNav } from '@/components/shared/pagination-nav';
import { ProductFiltersBar } from '@/components/shared/product-filters';
import { ProductGrid } from '@/components/shared/product-grid';
import { searchProducts } from '@/lib/services/product.service';
import { parsePageParam } from '@/lib/utils/pagination';
import { filtrosEnUrl, parseFilters } from '@/lib/utils/product-filters';

export const metadata = {
  title: 'Buscar',
  // La página de resultados no aporta nada a un buscador y genera URLs
  // infinitas según el término consultado.
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<'/buscar'>) {
  const sp = await searchParams;
  const query = typeof sp.q === 'string' ? sp.q : '';
  const page = parsePageParam(sp.page);
  const filters = parseFilters(sp);

  const results = await searchProducts(query, page, filters);

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

      {query && results.total > 0 && (
        <ProductFiltersBar
          basePath="/buscar"
          searchParams={sp}
          filters={filters}
          total={results.total}
        />
      )}

      <ProductGrid products={results.items} />

      <PaginationNav
        page={results.page}
        pageCount={results.pageCount}
        basePath="/buscar"
        params={{ q: query, ...filtrosEnUrl(sp) }}
      />
    </div>
  );
}
