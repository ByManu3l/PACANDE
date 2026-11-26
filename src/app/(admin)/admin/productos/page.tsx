import { listCategoriesAction } from '@/actions/category.actions';
import { listProductsAction } from '@/actions/product.actions';
import { ProductsTable } from '@/components/admin/products-table';
import { PaginationNav } from '@/components/shared/pagination-nav';
import { parsePageParam } from '@/lib/utils/pagination';
import { TITULO_ADMIN } from '@/components/shared/estilo-original';

export const metadata = { title: 'Productos' };

export default async function AdminProductsPage({ searchParams }: PageProps<'/admin/productos'>) {
  const { page } = await searchParams;
  const [productos, categories] = await Promise.all([
    listProductsAction(parsePageParam(page)),
    listCategoriesAction(),
  ]);

  // Los productos solo se asignan a categorías hoja: una categoría con
  // hijas muestra una grilla de subcategorías en la tienda, nunca de
  // productos, así que un producto colgado ahí sería invisible.
  const categoryOptions = categories
    .filter((c) => c._count.children === 0)
    .map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} / ${c.name}` : c.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className={TITULO_ADMIN}>Productos</h1>
        <p className="text-muted-foreground text-sm">
          {productos.total} {productos.total === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      <ProductsTable
        initialProducts={productos.items}
        categoryOptions={categoryOptions}
        page={productos.page}
      />

      <PaginationNav
        page={productos.page}
        pageCount={productos.pageCount}
        basePath="/admin/productos"
      />
    </div>
  );
}
