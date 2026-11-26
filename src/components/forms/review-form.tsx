'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createReviewAction } from '@/actions/review.actions';
import { BOTON_TIENDA } from '@/components/shared/estilo-original';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MAX_RATING, type ReviewInput, reviewSchema } from '@/lib/validations/review';

/**
 * Formulario de opinión.
 *
 * Solo se renderiza para quien compró el producto y aún no ha opinado; esa
 * decisión la toma `ReviewSection` en el servidor.
 *
 * La calificación es un grupo de botones y no un `<select>` porque elegir
 * estrellas es la convención y se hace de un clic. El valor real viaja en
 * un campo oculto que registra `react-hook-form`, de modo que la
 * validación compartida sigue aplicando igual.
 */
export function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [hover, setHover] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { productId, rating: 0, title: '', body: '' },
  });

  const rating = watch('rating');

  async function onSubmit(values: ReviewInput) {
    const resultado = await createReviewAction(values);

    if (!resultado.success) {
      toast.error(resultado.error);
      return;
    }

    // Se avisa de que pasa por revisión. Sin esto, quien opina no ve su
    // texto en la página y cree que se perdió.
    toast.success('¡Gracias! Tu opinión se publicará tras una revisión rápida.');
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-muted/30 space-y-4 rounded-lg border p-4"
      aria-label={`Escribir una opinión sobre ${productName}`}
    >
      <input type="hidden" {...register('productId')} />

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Tu calificación</legend>

        <div
          className="flex gap-1"
          onMouseLeave={() => setHover(0)}
          role="radiogroup"
          aria-label="Calificación de 1 a 5 estrellas"
        >
          {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((nota) => {
            const activa = nota <= (hover || rating);

            return (
              <button
                key={nota}
                type="button"
                role="radio"
                aria-checked={rating === nota}
                aria-label={`${nota} ${nota === 1 ? 'estrella' : 'estrellas'}`}
                onMouseEnter={() => setHover(nota)}
                onClick={() => setValue('rating', nota, { shouldValidate: true })}
                className="focus-visible:ring-ring rounded p-0.5 transition focus-visible:ring-2 focus-visible:outline-none"
              >
                <Star
                  className={cn(
                    'size-7 transition',
                    activa ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                  )}
                />
              </button>
            );
          })}
        </div>

        {errors.rating && <p className="text-destructive text-sm">{errors.rating.message}</p>}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="review-title">Título (opcional)</Label>
        <Input id="review-title" placeholder="Resume tu experiencia" {...register('title')} />
        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-body">Tu opinión</Label>
        <Textarea
          id="review-body"
          rows={4}
          placeholder="¿Qué te pareció? ¿Lo recomendarías?"
          {...register('body')}
        />
        {errors.body && <p className="text-destructive text-sm">{errors.body.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className={BOTON_TIENDA}>
        {isSubmitting ? 'Publicando…' : 'Publicar opinión'}
      </button>
    </form>
  );
}
