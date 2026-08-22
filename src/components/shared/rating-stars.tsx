import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RatingStarsProps {
  /** Media de 0 a 5. Acepta texto porque llega de un `Decimal` de Prisma. */
  value: number | string;
  /** Número de opiniones. Si es 0, se muestra el estado «sin opiniones». */
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Oculta el texto junto a las estrellas. Para espacios estrechos. */
  hideLabel?: boolean;
  className?: string;
}

const TAMANOS = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

/**
 * Valoración media en estrellas.
 *
 * **Las medias se rellenan con un recorte, no redondeando.** Una media de
 * 4,2 dibujada como 4 estrellas exactas pierde información y hace que dos
 * productos claramente distintos —4,0 y 4,4— se vean idénticos. Aquí la
 * quinta estrella se rellena al 20 % superponiendo una copia recortada
 * con `width`, técnica que funciona sin JavaScript y en cualquier tamaño.
 *
 * Para lectores de pantalla, el conjunto se anuncia como un único texto
 * («4,2 de 5, 18 opiniones»); las estrellas en sí quedan ocultas, porque
 * escuchar «estrella, estrella, estrella…» no aporta nada.
 */
export function RatingStars({
  value,
  count,
  size = 'md',
  hideLabel = false,
  className,
}: RatingStarsProps) {
  const media = Math.max(0, Math.min(5, Number(value) || 0));
  const porcentaje = (media / 5) * 100;
  const claseEstrella = TAMANOS[size];

  const etiqueta =
    count === 0
      ? 'Sin opiniones todavía'
      : `${media.toFixed(1)} de 5${count != null ? `, ${count} ${count === 1 ? 'opinión' : 'opiniones'}` : ''}`;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={etiqueta}>
      <span className="relative inline-flex" aria-hidden="true">
        {/* Capa base: las cinco estrellas vacías. */}
        <span className="inline-flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={cn(claseEstrella, 'text-muted-foreground/30')} />
          ))}
        </span>

        {/* Capa de relleno, recortada al porcentaje exacto de la media. */}
        <span
          className="absolute inset-0 inline-flex overflow-hidden"
          style={{ width: `${porcentaje}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={cn(claseEstrella, 'shrink-0 fill-amber-400 text-amber-400')} />
          ))}
        </span>
      </span>

      {!hideLabel && (
        <span className="text-muted-foreground text-xs">
          {count === 0
            ? 'Sin opiniones'
            : `${media.toFixed(1)}${count != null ? ` (${count})` : ''}`}
        </span>
      )}

      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}
