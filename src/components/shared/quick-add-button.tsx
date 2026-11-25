'use client';

import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { addToCartAction } from '@/actions/cart.actions';
import { Button } from '@/components/ui/button';

interface QuickAddButtonProps {
  productId: string;
  productName: string;
  stock: number;
}

/**
 * Añade una unidad al carrito desde la tarjeta, sin abrir la ficha.
 *
 * Tres detalles que no son cosméticos:
 *
 * - **Va fuera del `<Link>` de la tarjeta.** Un `<button>` dentro de un
 *   enlace es HTML inválido y, en la práctica, el navegador acaba
 *   navegando al pulsarlo. Por eso la tarjeta coloca este botón como
 *   hermano del enlace, no dentro.
 * - **`stopPropagation` y `preventDefault`.** El botón se superpone al
 *   área del enlace; sin esto, un clic añadiría al carrito *y* navegaría.
 * - **El nombre accesible incluye el producto.** En una grilla de 24
 *   tarjetas, veinticuatro botones llamados «Añadir al carrito» son
 *   indistinguibles para quien navega con lector de pantalla.
 *
 * Añade siempre una unidad: para elegir cantidad está la ficha. Una
 * tarjeta de catálogo tiene que resolver el caso común en un clic.
 */
export function QuickAddButton({ productId, productName, stock }: QuickAddButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (stock === 0) return null;

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      aria-label={`Añadir ${productName} al carrito`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const result = await addToCartAction(productId, 1);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success(`${productName} añadido al carrito.`);
          router.refresh();
        });
      }}
      className="w-full transition-all duration-300"
    >
      <ShoppingCart className="size-4" />
      {isPending ? 'Agregando…' : 'Añadir al carrito'}
    </Button>
  );
}
