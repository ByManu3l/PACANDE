'use client';

import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { addToCartAction } from '@/actions/cart.actions';
import { BOTON_TIENDA } from '@/components/shared/estilo-original';
import { Button } from '@/components/ui/button';

interface AddToCartButtonProps {
  productId: string;
  stock: number;
}

export function AddToCartButton({ productId, stock }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (stock === 0) {
    return (
      <button type="button" disabled className={`${BOTON_TIENDA} w-full`}>
        Agotado
      </button>
    );
  }

  const handleAdd = () => {
    startTransition(async () => {
      const result = await addToCartAction(productId, quantity);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Producto agregado al carrito.');
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Botones de solo icono: necesitan `aria-label` o se anuncian como
          «botón» a secas. `aria-live` en la cantidad hace que el valor
          nuevo se lea al cambiarlo, sin volver a recorrer el grupo. */}
      <div
        className="flex items-center rounded-lg border"
        role="group"
        aria-label="Cantidad a añadir"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={quantity <= 1}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Disminuir la cantidad"
        >
          <Minus className="size-4" />
        </Button>

        <span className="w-8 text-center text-sm" aria-live="polite">
          {quantity}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={quantity >= stock}
          onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
          aria-label="Aumentar la cantidad"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending}
        className={`${BOTON_TIENDA} flex-1`}
      >
        <ShoppingCart /> {isPending ? 'Agregando…' : 'Agregar al Carrito'}
      </button>
    </div>
  );
}
