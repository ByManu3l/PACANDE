'use client';

import { Tag, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { applyCouponAction } from '@/actions/coupon.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils/currency';

export interface CuponAplicado {
  code: string;
  /** Texto, no número: viene de un `Decimal` del servidor. */
  discount: string;
}

interface CouponFormProps {
  /** Se avisa al carrito para que actualice el total mostrado. */
  onChange: (cupon: CuponAplicado | null) => void;
  applied: CuponAplicado | null;
  /** Sin sesión no se puede validar: el cupón depende del carrito guardado. */
  isAuthenticated: boolean;
}

/**
 * Campo de cupón del carrito.
 *
 * Lo que muestra aquí es una **vista previa**. El descuento que finalmente
 * se cobra lo recalcula el servidor dentro de la transacción de la compra,
 * con el carrito de ese momento: entre aplicar el cupón y pagar, el
 * carrito puede cambiar de importe y el cupón puede caducar o agotarse.
 *
 * El código se pasa a mayúsculas mientras se escribe. Es cosmético, pero
 * evita la duda de si «verano25» y «VERANO25» son lo mismo —lo son, el
 * servidor normaliza— y hace que el campo se vea como lo que es.
 */
export function CouponForm({ onChange, applied, isAuthenticated }: CouponFormProps) {
  const [codigo, setCodigo] = useState('');
  const [pendiente, startTransition] = useTransition();

  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;

    startTransition(async () => {
      const resultado = await applyCouponAction({ code: codigo });

      if (!resultado.success) {
        // El mensaje explica el motivo concreto —caducado, falta importe
        // mínimo— en vez de un «cupón no válido» genérico. A quien le
        // falta poco para el mínimo, suele añadir algo más al carrito.
        toast.error(resultado.error);
        return;
      }

      onChange(resultado.data);
      setCodigo('');
      toast.success(`Cupón ${resultado.data.code} aplicado.`);
    });
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-green-600/40 bg-green-600/5 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Tag className="size-4 shrink-0 text-green-700 dark:text-green-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{applied.code}</p>
            <p className="text-muted-foreground text-xs">
              −{formatPrice(applied.discount)} de descuento
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          aria-label={`Quitar el cupón ${applied.code}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className="text-muted-foreground text-xs">
        Inicia sesión para usar un cupón de descuento.
      </p>
    );
  }

  return (
    <form onSubmit={aplicar} className="space-y-1.5">
      <Label htmlFor="coupon-code" className="text-muted-foreground text-xs">
        ¿Tienes un cupón?
      </Label>
      <div className="flex gap-2">
        <Input
          id="coupon-code"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          autoComplete="off"
          // `font-mono` con espaciado ancho: los códigos se dictan y se
          // copian, y un 0 y una O confundidos cuestan una venta.
          className="h-9 font-mono tracking-wider uppercase"
        />
        <Button type="submit" variant="outline" size="sm" disabled={pendiente || !codigo.trim()}>
          {pendiente ? '…' : 'Aplicar'}
        </Button>
      </div>
    </form>
  );
}
