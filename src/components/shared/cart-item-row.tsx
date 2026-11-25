'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { removeFromCartAction, updateCartItemAction } from '@/actions/cart.actions';
import { TARJETA_MUI } from '@/components/shared/estilo-original';
import { formatPrice } from '@/lib/utils/currency';

interface CartItemRowProps {
  item: {
    productId: string;
    quantity: number;
    product: { name: string; slug: string; price: string; images: string[]; stock: number };
  };
}

export function CartItemRow({ item }: CartItemRowProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const runUpdate = (quantity: number) => {
    startTransition(async () => {
      const result = await updateCartItemAction(item.productId, quantity);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  };

  const runRemove = () => {
    startTransition(async () => {
      const result = await removeFromCartAction(item.productId);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  };

  return (
    // Tarjeta por producto, con la foto de 150 px a la izquierda: la fila
    // del carrito de la versión original.
    <div className={`${TARJETA_MUI} flex flex-col overflow-hidden sm:flex-row`}>
      <div className="relative h-40 w-full shrink-0 sm:h-auto sm:min-h-32 sm:w-[150px]">
        {item.product.images[0] && (
          <Image
            src={item.product.images[0]}
            alt={item.product.name}
            fill
            sizes="150px"
            className="object-contain"
          />
        )}
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <Link
            href={`/producto/${item.product.slug}`}
            className="text-xl leading-[1.6] font-medium tracking-[0.0075em] hover:underline"
          >
            {item.product.name}
          </Link>
          <p className="text-sm text-[rgba(0,0,0,0.6)]">
            Precio: {formatPrice(item.product.price)}
          </p>
          <p className="text-sm text-[rgba(0,0,0,0.6)]">
            Total: {formatPrice(Number(item.product.price) * item.quantity)}
          </p>
        </div>

        {/* Los botones son solo iconos, así que llevan `aria-label` con el
            nombre del producto: sin él, un lector de pantalla anuncia
            «botón, botón, botón» en cada línea y no hay forma de saber a
            qué producto corresponde cada uno. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => runUpdate(item.quantity - 1)}
            aria-label={`Quitar una unidad de ${item.product.name}`}
            className={ICONO}
          >
            <Minus className="size-5" />
          </button>

          {/* `aria-live`: al cambiar la cantidad, el nuevo valor se anuncia
              sin que haya que volver a recorrer la fila. */}
          <span
            className="grid h-10 w-[60px] place-items-center rounded-[4px] border border-[rgba(0,0,0,0.23)]"
            aria-live="polite"
          >
            {item.quantity}
          </span>

          <button
            type="button"
            disabled={isPending || item.quantity >= item.product.stock}
            onClick={() => runUpdate(item.quantity + 1)}
            aria-label={`Añadir una unidad de ${item.product.name}`}
            className={ICONO}
          >
            <Plus className="size-5" />
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={runRemove}
            aria-label={`Eliminar ${item.product.name} del carrito`}
            className={`${ICONO} text-[#d32f2f] hover:bg-[rgba(211,47,47,0.04)]`}
          >
            <Trash2 className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** `<IconButton>` de MUI: redondo, sin fondo hasta el hover. */
const ICONO =
  'grid size-10 cursor-pointer place-items-center rounded-full text-[rgba(0,0,0,0.54)] transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40';
