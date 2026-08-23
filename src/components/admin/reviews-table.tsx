'use client';

import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { deleteReviewAction, moderateReviewAction } from '@/actions/review.actions';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { RatingStars } from '@/components/shared/rating-stars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  user: { name: string; email: string };
  product: { name: string; slug: string };
};

const ETIQUETAS = {
  PENDING: { texto: 'Pendiente', variant: 'default' as const },
  APPROVED: { texto: 'Publicada', variant: 'secondary' as const },
  REJECTED: { texto: 'Rechazada', variant: 'outline' as const },
};

/**
 * Cola de moderación de opiniones.
 *
 * Las pendientes van primero (lo ordena el servicio): son la tarea real,
 * y una cola que obliga a buscarlas entre las ya resueltas deja de usarse.
 *
 * Aprobar y rechazar son acciones de un clic, sin diálogo de confirmación:
 * ambas son reversibles —se puede volver a cambiar el estado— y pedir
 * confirmación para algo reversible que se repite decenas de veces al día
 * es fricción sin ganancia. Eliminar sí la pide, porque eso no se deshace.
 */
export function ReviewsTable({ initialReviews }: { initialReviews: Review[] }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [enCurso, setEnCurso] = useState<string | null>(null);

  function moderar(id: string, status: 'APPROVED' | 'REJECTED') {
    setEnCurso(id);
    startTransition(async () => {
      const resultado = await moderateReviewAction(id, { status });
      setEnCurso(null);

      if (!resultado.success) {
        toast.error(resultado.error);
        return;
      }
      toast.success(status === 'APPROVED' ? 'Opinión publicada.' : 'Opinión rechazada.');
      router.refresh();
    });
  }

  if (initialReviews.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        No hay opiniones todavía. Aparecerán aquí en cuanto un cliente publique la primera.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Opinión</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {initialReviews.map((review) => (
          <TableRow key={review.id}>
            <TableCell className="align-top">
              <Link
                href={`/producto/${review.product.slug}`}
                className="text-sm font-medium hover:underline"
              >
                {review.product.name}
              </Link>
            </TableCell>

            <TableCell className="max-w-md align-top">
              <RatingStars value={review.rating} size="sm" hideLabel />
              {review.title && <p className="mt-1 text-sm font-medium">{review.title}</p>}
              {/* Sin recortar: para moderar hay que leer el texto entero,
                  que es justamente donde se esconde lo que hay que
                  rechazar. */}
              <p className="text-muted-foreground mt-0.5 text-sm whitespace-pre-line">
                {review.body}
              </p>
            </TableCell>

            <TableCell className="align-top">
              <p className="text-sm">{review.user.name}</p>
              <p className="text-muted-foreground text-xs">{review.user.email}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {review.createdAt.toLocaleDateString('es')}
              </p>
            </TableCell>

            <TableCell className="align-top">
              <Badge variant={ETIQUETAS[review.status].variant}>
                {ETIQUETAS[review.status].texto}
              </Badge>
            </TableCell>

            <TableCell className="text-right align-top">
              <div className="flex justify-end gap-1">
                {review.status !== 'APPROVED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendiente && enCurso === review.id}
                    onClick={() => moderar(review.id, 'APPROVED')}
                    aria-label={`Publicar la opinión de ${review.user.name}`}
                  >
                    <Check className="size-4" />
                  </Button>
                )}

                {review.status !== 'REJECTED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendiente && enCurso === review.id}
                    onClick={() => moderar(review.id, 'REJECTED')}
                    aria-label={`Rechazar la opinión de ${review.user.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                )}

                <DeleteConfirmDialog
                  itemName={`la opinión de ${review.user.name}`}
                  description="Se borra definitivamente y la valoración del producto se recalcula. Si solo quieres ocultarla, recházala en su lugar."
                  onConfirm={() => deleteReviewAction(review.id)}
                  successMessage="Opinión eliminada."
                  onDeleted={() => router.refresh()}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Filtro por estado. Enlaces, no botones: cambian la URL. */
export function ReviewsFilter({ current }: { current?: string }) {
  const opciones = [
    { value: undefined, label: 'Todas' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'APPROVED', label: 'Publicadas' },
    { value: 'REJECTED', label: 'Rechazadas' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((opcion) => (
        <ButtonLink
          key={opcion.label}
          href={opcion.value ? `/admin/resenas?estado=${opcion.value}` : '/admin/resenas'}
          size="sm"
          variant={current === opcion.value ? 'default' : 'outline'}
        >
          {opcion.label}
        </ButtonLink>
      ))}
    </div>
  );
}
