'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createProductAction,
  updateProductAction,
  uploadProductImagesAction,
} from '@/actions/product.actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/utils/slugify';
import { type ProductInput, productSchema } from '@/lib/validations/product';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormDialogProps {
  trigger: React.ReactNode;
  categoryOptions: CategoryOption[];
  product?: ProductInput & { id: string; images: string[] };
  onSaved: () => void;
}

export function ProductFormDialog({
  trigger,
  categoryOptions,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? {
      name: '',
      slug: '',
      description: '',
      price: 0,
      stock: 0,
      categoryId: '',
      isActive: true,
      isFeatured: false,
    },
  });

  useEffect(() => {
    if (open) {
      setImages(product?.images ?? []);
      reset(
        product ?? {
          name: '',
          slug: '',
          description: '',
          price: 0,
          stock: 0,
          categoryId: '',
          isActive: true,
          isFeatured: false,
        },
      );
    }
  }, [open, product, reset]);

  const name = watch('name');
  useEffect(() => {
    if (!isEdit) setValue('slug', slugify(name || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEdit]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));

    setUploading(true);
    const result = await uploadProductImagesAction(formData);
    setUploading(false);
    e.target.value = '';

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setImages((prev) => [...prev, ...result.data]);
  };

  const onSubmit = async (values: ProductInput) => {
    if (images.length === 0) {
      toast.error('Sube al menos una imagen.');
      return;
    }

    const result = isEdit
      ? await updateProductAction(product!.id, { ...values, images })
      : await createProductAction({ ...values, images });

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? 'Producto actualizado.' : 'Producto creado.');
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register('slug')} />
            {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" rows={3} {...register('description')} />
            {errors.description && (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio (COP)</Label>
              <Input
                id="price"
                type="number"
                step="1"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && <p className="text-destructive text-sm">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                step="1"
                {...register('stock', { valueAsNumber: true })}
              />
              {errors.stock && <p className="text-destructive text-sm">{errors.stock.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <Select
              value={watch('categoryId')}
              onValueChange={(v) => setValue('categoryId', v ?? '')}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-destructive text-sm">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Imágenes</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <div key={img} className="relative size-16 overflow-hidden rounded-lg border">
                  <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((i) => i !== img))}
                    className="absolute top-0 right-0 rounded-bl bg-black/60 p-0.5"
                  >
                    <X className="size-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="text-muted-foreground hover:border-primary flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(v) => setValue('isActive', Boolean(v))}
              />
              <Label htmlFor="isActive" className="font-normal">
                Activo
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isFeatured"
                checked={watch('isFeatured')}
                onCheckedChange={(v) => setValue('isFeatured', Boolean(v))}
              />
              <Label htmlFor="isFeatured" className="font-normal">
                Destacado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
