'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createCouponAction, updateCouponAction } from '@/actions/coupon.actions';
import type { CouponRow } from '@/components/admin/coupons-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { type CouponFormInput, couponSchema } from '@/lib/validations/coupon';

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /** `null` para crear uno nuevo. */
  coupon: CouponRow | null;
}

/** Convierte una fecha a `AAAA-MM-DD`, que es lo que espera un input date. */
function aFecha(valor: Date | null): string {
  return valor ? valor.toISOString().slice(0, 10) : '';
}

/**
 * Alta y edición de cupones.
 *
 * El diálogo es controlado desde fuera —una sola instancia para crear y
 * otra para editar— en vez de llevar su propio estado: la tabla necesita
 * saber qué cupón se está editando para precargar el formulario.
 *
 * Los campos numéricos opcionales se registran con `valueAsNumber` y se
 * convierten a `null` cuando quedan vacíos: en la base de datos, `null`
 * significa «sin límite», mientras que un `0` significaría «cero», que es
 * muy distinto.
 */
export function CouponFormDialog({ open, onOpenChange, onSaved, coupon }: CouponFormDialogProps) {
  const esEdicion = coupon !== null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: { type: 'PERCENTAGE', isActive: true },
  });

  const tipo = watch('type');

  // Precarga al abrir. Sin esto, abrir «editar» sobre otro cupón dejaría
  // los valores del anterior.
  useEffect(() => {
    if (!open) return;

    reset(
      coupon
        ? {
            code: coupon.code,
            description: coupon.description ?? '',
            type: coupon.type,
            value: Number(coupon.value),
            minPurchase: coupon.minPurchase !== null ? Number(coupon.minPurchase) : null,
            maxDiscount: coupon.maxDiscount !== null ? Number(coupon.maxDiscount) : null,
            maxUses: coupon.maxUses,
            startsAt: coupon.startsAt,
            endsAt: coupon.endsAt,
            isActive: coupon.isActive,
          }
        : {
            code: '',
            description: '',
            type: 'PERCENTAGE',
            value: 10,
            minPurchase: null,
            maxDiscount: null,
            maxUses: null,
            startsAt: null,
            endsAt: null,
            isActive: true,
          },
    );
  }, [open, coupon, reset]);

  async function onSubmit(values: CouponFormInput) {
    const resultado = esEdicion
      ? await updateCouponAction(coupon.id, values)
      : await createCouponAction(values);

    if (!resultado.success) {
      toast.error(resultado.error);
      return;
    }

    toast.success(esEdicion ? 'Cupón actualizado.' : 'Cupón creado.');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? `Editar ${coupon.code}` : 'Nuevo cupón'}</DialogTitle>
          <DialogDescription>
            El descuento se recalcula en el servidor al comprar, con el carrito real.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              placeholder="VERANO25"
              className="font-mono tracking-wider uppercase"
              {...register('code')}
            />
            {errors.code && <p className="text-destructive text-sm">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción interna (opcional)</Label>
            <Input id="description" placeholder="Campaña de verano" {...register('description')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setValue('type', v as 'PERCENTAGE' | 'FIXED')}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                  <SelectItem value="FIXED">Importe fijo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value">{tipo === 'PERCENTAGE' ? 'Porcentaje' : 'Importe'}</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min={0}
                {...register('value', { valueAsNumber: true })}
              />
              {errors.value && <p className="text-destructive text-sm">{errors.value.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="minPurchase">Compra mínima (opcional)</Label>
              <Input
                id="minPurchase"
                type="number"
                min={0}
                {...register('minPurchase', { setValueAs: aNumeroONulo })}
              />
            </div>

            {/* El tope solo tiene sentido en los porcentuales: en un
                importe fijo, el importe ya es el tope. */}
            {tipo === 'PERCENTAGE' && (
              <div className="space-y-1.5">
                <Label htmlFor="maxDiscount">Descuento máximo (opcional)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  min={0}
                  {...register('maxDiscount', { setValueAs: aNumeroONulo })}
                />
                {errors.maxDiscount && (
                  <p className="text-destructive text-sm">{errors.maxDiscount.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">Usos máximos</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                placeholder="Ilimitado"
                {...register('maxUses', { setValueAs: aNumeroONulo })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Desde</Label>
              <Input
                id="startsAt"
                type="date"
                defaultValue={aFecha(coupon?.startsAt ?? null)}
                {...register('startsAt', { setValueAs: aFechaONulo })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endsAt">Hasta</Label>
              <Input
                id="endsAt"
                type="date"
                defaultValue={aFecha(coupon?.endsAt ?? null)}
                {...register('endsAt', { setValueAs: aFechaONulo })}
              />
              {errors.endsAt && <p className="text-destructive text-sm">{errors.endsAt.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={watch('isActive')}
              onCheckedChange={(v) => setValue('isActive', Boolean(v))}
            />
            <Label htmlFor="isActive">Activo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Campo numérico vacío → `null`, no `0`.
 *
 * En la base de datos `null` significa «sin límite» y `0` significaría
 * «cero», que aplicado a «usos máximos» dejaría el cupón inservible.
 */
function aNumeroONulo(valor: string): number | null {
  if (valor === '' || valor === null) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Campo de fecha vacío → `null`, que significa «sin límite por ese lado». */
function aFechaONulo(valor: string): Date | null {
  return valor ? new Date(valor) : null;
}
