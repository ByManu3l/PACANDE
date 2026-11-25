'use client';

import { Check, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { addToCartAction } from '@/actions/cart.actions';
import { cn } from '@/lib/utils';

interface QuickAddButtonProps {
  productId: string;
  productName: string;
  stock: number;
  /**
   * `carrito` añade una unidad y se queda en la página. `comprar` añade
   * y lleva directo al pago: el «Comprar Ahora» de la tarjeta original.
   */
  modo?: 'carrito' | 'comprar';
}

/**
 * Botones de la tarjeta de producto, con el aspecto de la versión
 * original: rojo puro, esquinas rectas, y al añadir un rebote y una
 * franja verde «¡Agregado! ✓» que sube desde abajo.
 *
 * Tres detalles que no son cosméticos:
 *
 * - **Va fuera del enlace de la tarjeta.** Un `<button>` dentro de un
 *   `<a>` es HTML inválido y, en la práctica, el navegador acaba
 *   navegando al pulsarlo.
 * - **El nombre accesible empieza por el texto visible y añade el
 *   producto** («Agregar al Carrito: Camiseta Negra»). En una grilla de 24 tarjetas, veinticuatro botones llamados
 *   igual son indistinguibles para un lector de pantalla; y quien usa
 *   control por voz dice lo que ve —«Agregar al Carrito»— y funciona.
 * - **Añade siempre una unidad.** Para elegir cantidad está la ficha.
 */
export function QuickAddButton({
  productId,
  productName,
  stock,
  modo = 'carrito',
}: QuickAddButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [agregado, setAgregado] = useState(false);
  const router = useRouter();

  if (stock === 0) return null;

  const comprar = modo === 'comprar';
  // Mayúsculas de título, como en los botones originales.
  const etiqueta = comprar ? 'Comprar Ahora' : 'Agregar al Carrito';

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={`${etiqueta}: ${productName}`}
      onClick={() => {
        startTransition(async () => {
          const result = await addToCartAction(productId, 1);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          if (comprar) {
            router.push('/checkout');
            return;
          }
          toast.success(`${productName} agregado al carrito.`);
          setAgregado(true);
          window.setTimeout(() => setAgregado(false), 1000);
          router.refresh();
        });
      }}
      className={cn(
        'group/boton bg-primary hover:bg-brand-dark focus-visible:ring-brand relative flex w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden px-5 py-2.5 text-white transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait',
        agregado && 'animate-[rebote_0.5s_ease]',
      )}
    >
      {!comprar && (
        <ShoppingCart
          aria-hidden="true"
          className="size-4 fill-current transition-transform duration-300 group-hover/boton:translate-x-[3px]"
        />
      )}
      {isPending ? (comprar ? 'Procesando…' : 'Agregando…') : etiqueta}

      {!comprar && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-1.5 bg-[rgba(40,167,69,0.9)] transition-transform duration-300',
            agregado ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          ¡Agregado! <Check className="size-4" />
        </span>
      )}
    </button>
  );
}
