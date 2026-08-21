import { ProductCard } from '@/components/shared/product-card';
import { searchProducts } from '@/lib/services/product.service';

export default async function SearchPage({ searchParams }: PageProps<'/buscar'>) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';

  const products = query ? await searchProducts(query) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {query ? `Resultados para "${query}"` : 'Buscar productos'}
      </h1>

      {query && products.length === 0 && (
        <p className="text-muted-foreground">No encontramos productos que coincidan.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.slug}
            product={{ ...product, price: product.price.toString() }}
          />
        ))}
      </div>
    </div>
  );
}
