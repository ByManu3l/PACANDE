'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

/**
 * Galería de la ficha de producto.
 *
 * Sustituye a la pila de imágenes anterior, que obligaba a desplazarse
 * para ver la segunda foto y no permitía volver a la principal.
 *
 * Es un componente de cliente porque necesita estado para saber qué
 * imagen se está viendo. El resto de la ficha sigue siendo servidor.
 *
 * Detalles que no son decorativos:
 *
 * - La imagen activa lleva `priority`: es el elemento LCP de esta página.
 * - Las miniaturas se precargan a baja resolución (`sizes="80px"`), de
 *   modo que cambiar de foto sea instantáneo y no muestre un hueco.
 * - Las flechas solo aparecen con más de una imagen, y el índice se mueve
 *   en circular: desde la última, «siguiente» vuelve a la primera.
 * - Es navegable con teclado, y cada miniatura anuncia su posición.
 */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activa, setActiva] = useState(0);

  if (images.length === 0) {
    return <div className="bg-muted aspect-square rounded-lg" />;
  }

  const hayVarias = images.length > 1;
  const mover = (delta: number) => setActiva((i) => (i + delta + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="group bg-muted relative aspect-square overflow-hidden rounded-lg">
        <Image
          key={images[activa]}
          src={images[activa]}
          alt={`${productName} — imagen ${activa + 1} de ${images.length}`}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          priority
          className="object-cover"
        />

        {hayVarias && (
          <>
            <BotonFlecha lado="izquierda" onClick={() => mover(-1)} />
            <BotonFlecha lado="derecha" onClick={() => mover(1)} />

            {/* Contador: dice cuántas fotos hay sin tener que contarlas. */}
            <span className="bg-background/80 absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur">
              {activa + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hayVarias && (
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Miniaturas del producto">
          {images.map((image, i) => (
            <button
              key={image}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver imagen ${i + 1} de ${images.length}`}
              aria-current={i === activa}
              className={cn(
                'bg-muted focus-visible:ring-ring relative aspect-square overflow-hidden rounded-md border-2 transition focus-visible:ring-2 focus-visible:outline-none',
                i === activa
                  ? 'border-primary'
                  : 'hover:border-muted-foreground/30 border-transparent',
              )}
            >
              <Image src={image} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BotonFlecha({ lado, onClick }: { lado: 'izquierda' | 'derecha'; onClick: () => void }) {
  const Icono = lado === 'izquierda' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'izquierda' ? 'Imagen anterior' : 'Imagen siguiente'}
      className={cn(
        'bg-background/80 hover:bg-background focus-visible:ring-ring absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full backdrop-blur transition focus-visible:ring-2 focus-visible:outline-none',
        // Ocultas hasta pasar el cursor en escritorio, siempre visibles en
        // táctil: allí no hay hover y quedarían inalcanzables.
        'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
        lado === 'izquierda' ? 'left-2' : 'right-2',
      )}
    >
      <Icono className="size-5" />
    </button>
  );
}
