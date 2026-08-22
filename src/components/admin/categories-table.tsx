'use client';

import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import { deleteCategoryAction, listCategoriesAction } from '@/actions/category.actions';
import { CategoryFormDialog } from '@/components/admin/category-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CategoryRow = Awaited<ReturnType<typeof listCategoriesAction>>[number];

export function CategoriesTable({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [categories, setCategories] = useState(initialCategories);

  const refresh = async () => {
    setCategories(await listCategoriesAction());
  };

  // Solo las categorías de primer nivel pueden ser padre: la jerarquía es
  // de dos niveles a propósito (una categoría con hijos muestra una grilla
  // de subcategorías; una hoja muestra productos).
  const parentOptions = categories
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryFormDialog
          trigger={
            <Button>
              <Plus /> Nueva categoría
            </Button>
          }
          parentOptions={parentOptions}
          onSaved={refresh}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Padre</TableHead>
            <TableHead>Orden</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-sm">
                {category.slug}
              </TableCell>
              <TableCell>{category.parent?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{category.position}</TableCell>
              <TableCell>{category._count.products}</TableCell>
              <TableCell>
                <Badge variant={category.isActive ? 'default' : 'secondary'}>
                  {category.isActive ? 'Visible' : 'Oculta'}
                </Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <CategoryFormDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Editar ${category.name}`}>
                      <Pencil className="size-4" />
                    </Button>
                  }
                  parentOptions={parentOptions}
                  category={{
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                    description: category.description ?? '',
                    parentId: category.parentId ?? '',
                    position: category.position,
                    isActive: category.isActive,
                  }}
                  onSaved={refresh}
                />
                <DeleteConfirmDialog
                  itemName={category.name}
                  description="Esta acción no se puede deshacer. Una categoría con productos o subcategorías no puede eliminarse."
                  onConfirm={() => deleteCategoryAction(category.id)}
                  onDeleted={refresh}
                  successMessage="Categoría eliminada."
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
