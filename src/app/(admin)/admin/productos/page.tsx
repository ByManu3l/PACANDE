import { listCategoriesAction } from '@/actions/category.actions';
import { listProductsAction } from '@/actions/product.actions';
import { ProductsTable } from '@/components/admin/products-table';

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([listProductsAction(), listCategoriesAction()]);

  // Products only ever attach to leaf categories — a parent category
  // renders a subcategory grid on the storefront, never a product grid.
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
