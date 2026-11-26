import { listCategoriesAction } from '@/actions/category.actions';
import { CategoriesTable } from '@/components/admin/categories-table';
import { TITULO_ADMIN } from '@/components/shared/estilo-original';

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesAction();

  return (
    <div className="space-y-6">
      <h1 className={TITULO_ADMIN}>Categorías</h1>
      <CategoriesTable initialCategories={categories} />
    </div>
  );
}
