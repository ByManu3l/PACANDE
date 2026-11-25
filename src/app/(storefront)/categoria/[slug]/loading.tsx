import { ProductGridSkeleton } from '@/components/shared/product-grid-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      {/* Misma altura que la cabecera con foto, para que no salte. */}
      <Skeleton className="h-[260px] w-full rounded-[15px] lg:h-[330px]" />
      <div className="rounded-[15px] p-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] sm:p-[30px]">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
