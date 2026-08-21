'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteCategoryAction, listCategoriesAction } from '@/actions/category.actions';
import { CategoryFormDialog } from '@/components/admin/category-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  // AlertDialogAction here is a bare Button (see components/ui/alert-dialog.tsx)
  // with no built-in close-on-click, unlike Radix's — so the dialog's open
  // state has to be driven explicitly, closed once the action settles.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    setCategories(await listCategoriesAction());
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCategoryAction(id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Categoría eliminada.');
    refresh();
  };

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
              <TableCell>{category._count.products}</TableCell>
              <TableCell>
                <Badge variant={category.isActive ? 'default' : 'secondary'}>
                  {category.isActive ? 'Visible' : 'Oculta'}
                </Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <CategoryFormDialog
                  trigger={
                    <Button variant="ghost" size="icon">
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
                <AlertDialog
                  open={deletingId === category.id}
                  onOpenChange={(open) => setDeletingId(open ? category.id : null)}
                >
                  <AlertDialogTrigger
                    render={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar &quot;{category.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(category.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
