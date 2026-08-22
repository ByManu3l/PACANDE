import { RatingStars } from '@/components/shared/rating-stars';
import { ReviewForm } from '@/components/forms/review-form';
import { auth } from '@/lib/auth';
import {
  getProductReviews,
  getRatingBreakdown,
  getUserReview,
  hasPurchased,
} from '@/lib/services/review.service';

interface ReviewSectionProps {
  productId: string;
  productName: string;
  ratingAverage: string;
  ratingCount: number;
}

/**
 * Bloque de opiniones de la ficha de producto.
 *
 * Server Component: decide en el servidor qué puede hacer quien mira, así
 * que el formulario no aparece y desaparece al cargar. Hay cuatro estados
 * posibles y cada uno dice algo distinto:
 *
 * 1. Sin sesión → invitación a entrar.
 * 2. Con sesión pero sin haber comprado → se explica la regla, en vez de
 *    ofrecer un formulario que va a rechazarse.
 * 3. Ya opinó → se le recuerda, con el estado de su opinión (una que
 *    sigue pendiente de moderación, si no se dijera, parecería perdida).
 * 4. Compró y no ha opinado → el formulario.
 */
export async function ReviewSection({
  productId,
  productName,
  ratingAverage,
  ratingCount,
}: ReviewSectionProps) {
  const session = await auth();

  const [reviews, desglose, propia, compro] = await Promise.all([
    getProductReviews(productId, 1),
    getRatingBreakdown(productId),
    session?.user ? getUserReview(session.user.id, productId) : null,
    session?.user ? hasPurchased(session.user.id, productId) : false,
  ]);

  return (
    <section className="space-y-6 border-t pt-8" id="opiniones">
      <h2 className="text-xl font-semibold tracking-tight">Opiniones de clientes</h2>

      {ratingCount === 0 ? (
        <p className="text-muted-foreground">
          Este producto todavía no tiene opiniones. Si lo compraste, tu reseña será la primera.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
          {/* Resumen: la nota grande es lo primero que se busca. */}
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-4xl font-bold">{Number(ratingAverage).toFixed(1)}</p>
            <RatingStars value={ratingAverage} hideLabel />
            <p className="text-muted-foreground text-sm">
              {ratingCount} {ratingCount === 1 ? 'opinión' : 'opiniones'}
            </p>
          </div>

          {/* Desglose: una media de 4,2 no dice si viene de opiniones
              consistentes o de una mezcla de cincos y unos. */}
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((nota) => {
              const cuantas = desglose[nota] ?? 0;
              const porcentaje = ratingCount > 0 ? (cuantas / ratingCount) * 100 : 0;

              return (
                <div key={nota} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-8 shrink-0 tabular-nums">{nota} ★</span>
                  <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 shrink-0 text-right tabular-nums">
                    {cuantas}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EstadoDelFormulario
        productId={productId}
        productName={productName}
        haySesion={Boolean(session?.user)}
        compro={compro}
        propia={propia}
      />

      {reviews.items.length > 0 && (
        <ul className="space-y-6">
          {reviews.items.map((review) => (
            <li key={review.id} className="space-y-1.5 border-t pt-6 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingStars value={review.rating} size="sm" hideLabel />
                <span className="text-sm font-medium">{review.user.name}</span>
                <span className="text-muted-foreground text-xs">
                  {/* Fecha corta: la hora exacta de una opinión no aporta. */}
                  <time dateTime={review.createdAt.toISOString()}>
                    {review.createdAt.toLocaleDateString('es', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </span>
              </div>

              {review.title && <p className="font-medium">{review.title}</p>}
              <p className="text-muted-foreground text-sm whitespace-pre-line">{review.body}</p>
            </li>
          ))}
        </ul>
      )}

      {reviews.pageCount > 1 && (
        <p className="text-muted-foreground text-sm">
          Mostrando las {reviews.items.length} opiniones más recientes de {reviews.total}.
        </p>
      )}
    </section>
  );
}

function EstadoDelFormulario({
  productId,
  productName,
  haySesion,
  compro,
  propia,
}: {
  productId: string;
  productName: string;
  haySesion: boolean;
  compro: boolean;
  propia: Awaited<ReturnType<typeof getUserReview>>;
}) {
  if (propia) {
    return (
      <div className="bg-muted/50 space-y-1 rounded-lg border p-4 text-sm">
        <p className="font-medium">Ya publicaste tu opinión sobre este producto.</p>
        {propia.status === 'PENDING' && (
          <p className="text-muted-foreground">
            Está pendiente de revisión. Aparecerá aquí en cuanto la aprobemos.
          </p>
        )}
        {propia.status === 'REJECTED' && (
          <p className="text-muted-foreground">
            No pudimos publicarla. Si crees que es un error, escríbenos desde la página de contacto.
          </p>
        )}
      </div>
    );
  }

  if (!haySesion) {
    return (
      <p className="text-muted-foreground text-sm">
        ¿Compraste este producto?{' '}
        <a href="/login" className="text-primary font-medium hover:underline">
          Inicia sesión
        </a>{' '}
        para dejar tu opinión.
      </p>
    );
  }

  if (!compro) {
    // Se explica la regla en vez de ofrecer un formulario que el servidor
    // va a rechazar. Además, dicha así, es una señal de confianza: las
    // opiniones de esta tienda son de compradores reales.
    return (
      <p className="text-muted-foreground text-sm">
        Solo quienes compraron este producto pueden opinar sobre él.
      </p>
    );
  }

  return <ReviewForm productId={productId} productName={productName} />;
}
