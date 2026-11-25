'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface HeroCarouselProps {
  /** Rutas de las imágenes, en orden. Al menos una. */
  images: string[];
  /** Milisegundos entre transiciones automáticas. */
  intervalMs?: number;
  /** Contenido superpuesto (titular, descripción, llamada a la acción). */
  children?: React.ReactNode;
}

/**
 * Carrusel de portada: transición por fundido, avance automático y flechas.
 *
 * Tres decisiones que no son cosméticas:
 *
 * - **Se detiene al pasar el ratón o al enfocar con el teclado.** Un
 *   carrusel que sigue moviéndose mientras alguien intenta leer o pulsar
 *   una de sus flechas es una trampa de usabilidad.
 * - **Respeta `prefers-reduced-motion`.** Quien pidió menos movimiento en
 *   su sistema no recibe avance automático; las flechas siguen estando.
 * - **Las imágenes son decorativas** (`alt=""`) y el contenedor se anuncia
 *   como carrusel. El contenido con significado va en `children`, así que
 *   describir cada foto solo añadiría ruido a un lector de pantalla.
 */
export function HeroCarousel({ images, intervalMs = 3000, children }: HeroCarouselProps) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  // Se incrementa en cada interacción manual. Está en las dependencias del
  // efecto para que el temporizador vuelva a empezar al usar las flechas:
  // sin esto, pulsar «siguiente» justo antes de un tic encadenaría dos
  // saltos casi seguidos.
  const [reinicio, setReinicio] = useState(0);
  const total = images.length;

  const ir = useCallback(
    (delta: number) => {
      setActual((i) => (i + delta + total) % total);
      setReinicio((n) => n + 1);
    },
    [total],
  );

  useEffect(() => {
    if (total <= 1 || pausado) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Actualización funcional en lugar de leer `actual`: así el efecto no
    // depende del índice y el intervalo sobrevive a los cambios de página.
    const id = window.setInterval(() => setActual((i) => (i + 1) % total), intervalMs);
    return () => window.clearInterval(id);
  }, [pausado, intervalMs, total, reinicio]);

  return (
    <div
      className="relative h-full w-full"
      role="group"
      aria-roledescription="carrusel"
      aria-label="Destacados de la tienda"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ease-in-out ${
            i === actual ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      <div className="absolute inset-0 bg-black/45" />

      {children}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(-1)}
            aria-label="Imagen anterior"
            className="absolute top-1/2 left-2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition-all duration-300 hover:bg-black/70 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:left-4"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => ir(1)}
            aria-label="Imagen siguiente"
            className="absolute top-1/2 right-2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition-all duration-300 hover:bg-black/70 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:right-4"
          >
            <ChevronRight className="size-6" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => {
                  setActual(i);
                  setReinicio((n) => n + 1);
                }}
                aria-label={`Ir a la imagen ${i + 1} de ${total}`}
                aria-current={i === actual}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                  i === actual ? 'w-6 bg-red-600' : 'w-2 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
