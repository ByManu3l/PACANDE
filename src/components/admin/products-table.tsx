'use client';

import { Pencil, Plus } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { deleteProductAction, listProductsAction } from '@/actions/product.actions';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { ProductFormDialog } from '@/components/admin/product-form-dialog';
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

  const refresh = async () => {
    setProducts(await listProductsAction());
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
                    <Button variant="ghost" size="icon" aria-label={`Editar ${product.name}`}>
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
                <DeleteConfirmDialog
                  itemName={product.name}
                  description="Esta acción no se puede deshacer. Los pedidos existentes conservan su información aunque el producto se elimine."
                  onConfirm={() => deleteProductAction(product.id)}
                  onDeleted={refresh}
                  successMessage="Producto eliminado."
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
