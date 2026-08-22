import { listCategoriesAction } from '@/actions/category.actions';
import { listProductsAction } from '@/actions/product.actions';
import { ProductsTable } from '@/components/admin/products-table';

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([listProductsAction(), listCategoriesAction()]);

  // Los productos solo se asignan a categorías hoja: una categoría con
  // hijas muestra una grilla de subcategorías en la tienda, nunca de
  // productos, así que un producto colgado ahí sería invisible.
  const categoryOptions = categories
    .filter((c) => c._count.children === 0)
    .map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} / ${c.name}` : c.name }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
      <ProductsTable initialProducts={products} categoryOptions={categoryOptions} />
    </div>
  );
}
