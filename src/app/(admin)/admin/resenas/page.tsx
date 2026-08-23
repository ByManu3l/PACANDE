import { listReviewsAction } from '@/actions/review.actions';
import { ReviewsFilter, ReviewsTable } from '@/components/admin/reviews-table';
import type { ReviewStatus } from '@/generated/prisma/client';

const ESTADOS: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export const metadata = { title: 'Opiniones' };

export default async function AdminReviewsPage({ searchParams }: PageProps<'/admin/resenas'>) {
  const { estado } = await searchParams;

  // El parámetro viene de la URL: solo se acepta si es un estado real.
  const filtro =
    typeof estado === 'string' && ESTADOS.includes(estado as ReviewStatus)
      ? (estado as ReviewStatus)
      : undefined;

  const reviews = await listReviewsAction(filtro);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Opiniones</h1>
        <p className="text-muted-foreground text-sm">
          Ninguna opinión se publica sola. Revisa el texto antes de aprobarla: es lo que evita que
          aparezcan insultos o enlaces de spam en la ficha de tus productos.
        </p>
        <ReviewsFilter current={filtro} />
      </div>

      <ReviewsTable initialReviews={reviews} />
    </div>
  );
}
