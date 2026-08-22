import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder de una grilla de productos mientras el servidor resuelve la
 * consulta.
 *
 * Reproduce la misma retícula y proporción (`aspect-square`) que
 * `ProductCard` a propósito: si el esqueleto no coincide con el contenido
 * real, la página “salta” al llegar los datos y empeora la experiencia en
 * vez de mejorarla.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
