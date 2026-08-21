import { listCategoriesAction } from '@/actions/category.actions';
import { CategoriesTable } from '@/components/admin/categories-table';

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesAction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
      <CategoriesTable initialCategories={categories} />
    </div>
  );
}
