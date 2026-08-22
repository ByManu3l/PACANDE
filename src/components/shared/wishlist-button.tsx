'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { toggleWishlistAction } from '@/actions/wishlist.actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  /** Estado inicial, resuelto en el servidor al renderizar la grilla. */
  initialWishlisted: boolean;
  /** Si no hay sesión, el botón lleva al login en vez de fallar. */
  isAuthenticated: boolean;
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Botón de favoritos.
 *
 * **Responde al instante**, con `useOptimistic`: el corazón se rellena al
 * pulsar y no cuando responde el servidor. En un botón de alternancia la
 * espera se nota mucho —parece que no funcionó y la gente vuelve a
 * pulsar—, y si la acción falla, React revierte el estado solo.
 *
 * Sin sesión no se deshabilita: se envía al login. Un botón apagado no
 * explica por qué, y guardar favoritos es justamente un motivo razonable
 * para crear una cuenta.
 */
export function WishlistButton({
  productId,
  initialWishlisted,
  isAuthenticated,
  variant = 'icon',
  className,
}: WishlistButtonProps) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [enFavoritos, setOptimistic] = useOptimistic(initialWishlisted);

  function alternar() {
    if (!isAuthenticated) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }

    startTransition(async () => {
      setOptimistic(!enFavoritos);
      const resultado = await toggleWishlistAction(productId);

      if (!resultado.success) {
        toast.error(resultado.error);
        return;
      }
      // `router.refresh()` sincroniza el resto de la página —el contador
      // del menú de cuenta, por ejemplo— con el estado real del servidor.
      router.refresh();
    });
  }

  const etiqueta = enFavoritos ? 'Quitar de favoritos' : 'Guardar en favoritos';

  if (variant === 'full') {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={alternar}
        disabled={pendiente}
        className={className}
      >
        <Heart className={cn('size-4', enFavoritos && 'fill-current text-red-500')} />
        {etiqueta}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        // La tarjeta entera es un enlace a la ficha; sin esto, pulsar el
        // corazón navegaría además de guardar.
        e.preventDefault();
        e.stopPropagation();
        alternar();
      }}
      disabled={pendiente}
      aria-label={etiqueta}
      aria-pressed={enFavoritos}
      title={etiqueta}
      className={cn(
        'bg-background/80 hover:bg-background focus-visible:ring-ring absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full backdrop-blur transition focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-4 transition',
          enFavoritos ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
        )}
      />
    </button>
  );
}
