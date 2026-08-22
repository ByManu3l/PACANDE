import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface PaginationNavProps {
  page: number;
  pageCount: number;
  /** Ruta base sin el parámetro de página, p. ej. `/categoria/ropa-hombre`. */
  basePath: string;
  /** Parámetros de consulta que deben conservarse al cambiar de página
   * (por ejemplo `q` en la búsqueda). */
  params?: Record<string, string | undefined>;
}

/**
 * Navegación entre páginas mediante enlaces reales (`<Link>`), no botones
 * con estado.
 *
 * Que cada página tenga su propia URL es lo que permite compartirla,
 * volver con el botón atrás del navegador y que un buscador la rastree —
 * tres cosas que se pierden si la paginación vive solo en estado de
 * cliente. Por eso este componente no necesita `'use client'`.
 */
export function PaginationNav({ page, pageCount, basePath, params = {} }: PaginationNavProps) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set('page', String(target));

    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav className="flex items-center justify-center gap-4 pt-4" aria-label="Paginación">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        render={page <= 1 ? <span /> : <Link href={hrefFor(page - 1)} />}
        nativeButton={false}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" /> Anterior
      </Button>

      <span className="text-muted-foreground text-sm" aria-current="page">
        Página {page} de {pageCount}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        render={page >= pageCount ? <span /> : <Link href={hrefFor(page + 1)} />}
        nativeButton={false}
        aria-label="Página siguiente"
      >
        Siguiente <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
