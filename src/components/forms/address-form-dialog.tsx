'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createAddressAction, updateAddressAction } from '@/actions/address.actions';
import type { AddressRow } from '@/components/forms/address-list';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { siteConfig } from '@/lib/config/site.config';
import { type AddressFormInput, addressSchema } from '@/lib/validations/address';

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /** `null` para añadir una nueva. */
  address: AddressRow | null;
}

/**
 * Alta y edición de direcciones.
 *
 * Los campos llevan `autoComplete` con los valores estándar: es lo que
 * permite al navegador rellenar la dirección de una vez, y una libreta de
 * direcciones que obliga a teclearlo todo no ahorra nada.
 *
 * El país se precarga con el de la tienda, que acierta en la mayoría de
 * los casos y deja el campo listo para corregir si no.
 */
export function AddressFormDialog({
  open,
  onOpenChange,
  onSaved,
  address,
}: AddressFormDialogProps) {
  const esEdicion = address !== null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormInput>({ resolver: zodResolver(addressSchema) });

  useEffect(() => {
    if (!open) return;

    reset(
      address ?? {
        label: 'Casa',
        recipientName: '',
        line1: '',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
        // Dos letras mayúsculas: `country` espera el código ISO.
        country: siteConfig.locale.split('-')[1]?.toUpperCase() ?? 'CO',
        phone: '',
        isDefault: false,
      },
    );
  }, [open, address, reset]);

  async function onSubmit(values: AddressFormInput) {
    const resultado = esEdicion
      ? await updateAddressAction(address.id, values)
      : await createAddressAction(values);

    if (!resultado.success) {
      toast.error(resultado.error);
      return;
    }

    toast.success(esEdicion ? 'Dirección actualizada.' : 'Dirección guardada.');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Campo
            id="label"
            etiqueta="Nombre"
            placeholder="Casa, Oficina…"
            registro={register('label')}
            error={errors.label?.message}
          />

          <Campo
            id="recipientName"
            etiqueta="Quién recibe"
            autoComplete="name"
            registro={register('recipientName')}
            error={errors.recipientName?.message}
          />

          <Campo
            id="line1"
            etiqueta="Dirección"
            placeholder="Calle 100 #15-20"
            autoComplete="address-line1"
            registro={register('line1')}
            error={errors.line1?.message}
          />

          <Campo
            id="line2"
            etiqueta="Apartamento, torre, referencia (opcional)"
            autoComplete="address-line2"
            registro={register('line2')}
            error={errors.line2?.message}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="city"
              etiqueta="Ciudad"
              autoComplete="address-level2"
              registro={register('city')}
              error={errors.city?.message}
            />
            <Campo
              id="region"
              etiqueta="Departamento o estado"
              autoComplete="address-level1"
              registro={register('region')}
              error={errors.region?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              id="postalCode"
              etiqueta="Código postal"
              autoComplete="postal-code"
              registro={register('postalCode')}
              error={errors.postalCode?.message}
            />
            <Campo
              id="country"
              etiqueta="País"
              placeholder="CO"
              autoComplete="country"
              registro={register('country')}
              error={errors.country?.message}
            />
            <Campo
              id="phone"
              etiqueta="Teléfono"
              autoComplete="tel"
              registro={register('phone')}
              error={errors.phone?.message}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isDefault"
              checked={watch('isDefault')}
              onCheckedChange={(v) => setValue('isDefault', Boolean(v))}
            />
            <Label htmlFor="isDefault">Usar como dirección predeterminada</Label>
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

/** Campo etiquetado con su mensaje de error. Evita repetir 9 veces lo mismo. */
function Campo({
  id,
  etiqueta,
  placeholder,
  autoComplete,
  registro,
  error,
}: {
  id: string;
  etiqueta: string;
  placeholder?: string;
  autoComplete?: string;
  registro: ReturnType<ReturnType<typeof useForm<AddressFormInput>>['register']>;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} placeholder={placeholder} autoComplete={autoComplete} {...registro} />
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
