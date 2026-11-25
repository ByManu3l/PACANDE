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
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 lg:grid-cols-3 xl:gap-10">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-3 border border-[#e0e0e0] p-5">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-2/3 rounded-none" />
          <Skeleton className="h-10 w-2/3 rounded-none" />
        </div>
      ))}
    </div>
  );
}
