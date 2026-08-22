'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createCategoryAction, updateCategoryAction } from '@/actions/category.actions';
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
import { slugify } from '@/lib/utils/slugify';
import { type CategoryInput, categorySchema } from '@/lib/validations/category';

interface CategoryOption {
  id: string;
  name: string;
}

interface CategoryFormDialogProps {
  trigger: React.ReactNode;
  parentOptions: CategoryOption[];
  category?: CategoryInput & { id: string };
  onSaved: () => void;
}

export function CategoryFormDialog({
  trigger,
  parentOptions,
  category,
  onSaved,
}: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(category);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ?? {
      name: '',
      slug: '',
      description: '',
      parentId: '',
      position: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        category ?? {
          name: '',
          slug: '',
          description: '',
          parentId: '',
          position: 0,
          isActive: true,
        },
      );
    }
  }, [open, category, reset]);

  const name = watch('name');
  useEffect(() => {
    if (!isEdit) setValue('slug', slugify(name || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEdit]);

  const onSubmit = async (values: CategoryInput) => {
    const result = isEdit
      ? await updateCategoryAction(category!.id, values)
      : await createCategoryAction(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? 'Categoría actualizada.' : 'Categoría creada.');
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
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
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentId">Categoría padre (opcional)</Label>
            <Select
              value={watch('parentId') || 'none'}
              onValueChange={(v) => setValue('parentId', !v || v === 'none' ? '' : v)}
            >
              <SelectTrigger id="parentId" className="w-full">
                <SelectValue placeholder="Ninguna (categoría de nivel superior)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna (nivel superior)</SelectItem>
                {parentOptions
                  .filter((p) => p.id !== category?.id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Orden</Label>
            <Input
              id="position"
              type="number"
              step="1"
              {...register('position', { valueAsNumber: true })}
            />
            <p className="text-muted-foreground text-xs">
              Menor número aparece primero en el menú. Si dos comparten número, se ordenan
              alfabéticamente.
            </p>
            {errors.position && (
              <p className="text-destructive text-sm">{errors.position.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={watch('isActive')}
              onCheckedChange={(v) => setValue('isActive', Boolean(v))}
            />
            <Label htmlFor="isActive" className="font-normal">
              Visible en la tienda
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
