'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteProductAction, listProductsAction } from '@/actions/product.actions';
import { ProductFormDialog } from '@/components/admin/product-form-dialog';
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
import { formatPrice } from '@/lib/utils/currency';

type ProductRow = Awaited<ReturnType<typeof listProductsAction>>[number];

interface ProductsTableProps {
  initialProducts: ProductRow[];
  categoryOptions: { id: string; name: string }[];
}

export function ProductsTable({ initialProducts, categoryOptions }: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts);
  // AlertDialogAction is a bare Button here (no built-in close-on-click,
  // unlike Radix's) — the dialog's open state has to be driven explicitly.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    setProducts(await listProductsAction());
  };

  const handleDelete = async (id: string) => {
    const result = await deleteProductAction(id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Producto eliminado.');
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ProductFormDialog
          trigger={
            <Button>
              <Plus /> Nuevo producto
            </Button>
          }
          categoryOptions={categoryOptions}
          onSaved={refresh}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.images[0] && (
                  <div className="relative size-10 overflow-hidden rounded">
                    <Image
                      src={product.images[0]}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {product.name}
                {product.isFeatured && (
                  <Badge variant="secondary" className="ml-2">
                    Destacado
                  </Badge>
                )}
              </TableCell>
              <TableCell>{product.category.name}</TableCell>
              <TableCell>{formatPrice(product.price.toString())}</TableCell>
              <TableCell>{product.stock}</TableCell>
              <TableCell>
                <Badge variant={product.isActive ? 'default' : 'secondary'}>
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <ProductFormDialog
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Pencil className="size-4" />
                    </Button>
                  }
                  categoryOptions={categoryOptions}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    price: Number(product.price),
                    stock: product.stock,
                    categoryId: product.categoryId,
                    isActive: product.isActive,
                    isFeatured: product.isFeatured,
                    images: product.images,
                  }}
                  onSaved={refresh}
                />
                <AlertDialog
                  open={deletingId === product.id}
                  onOpenChange={(open) => setDeletingId(open ? product.id : null)}
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
                      <AlertDialogTitle>¿Eliminar &quot;{product.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Los pedidos existentes conservan su
                        información aunque el producto se elimine.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(product.id)}>
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
