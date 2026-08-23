import { SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { siteConfig } from '@/lib/config/site.config';
import {
  buildFilterQuery,
  hasActiveFilters,
  type ProductFilters,
  sinFiltros,
  SORT_OPTIONS,
} from '@/lib/utils/product-filters';

interface ProductFiltersBarProps {
  basePath: string;
  /** Parámetros actuales de la URL, para conservarlos al cambiar uno. */
  searchParams: Record<string, string | string[] | undefined>;
  filters: ProductFilters;
  /** Total de resultados con los filtros aplicados. */
  total: number;
}

/**
 * Barra de filtros y ordenamiento del catálogo.
 *
 * **Es un Server Component sin JavaScript propio.** Cada opción es un
 * enlace o un formulario `GET` que cambia la URL; el filtrado ocurre en el
 * servidor. Esto tiene tres consecuencias que un panel de filtros con
 * estado de cliente no consigue:
 *
 * - Los resultados filtrados son compartibles y se pueden guardar en
 *   favoritos del navegador.
 * - El botón «atrás» deshace un filtro, que es lo que la gente espera.
 * - Funciona antes de que cargue el JavaScript, y también si nunca carga.
 *
 * Los controles usan `ButtonLink` y no `Button`: navegan, así que deben
 * ser enlaces también para un lector de pantalla. Ver el comentario de ese
 * componente.
 *
 * El precio es un formulario porque son dos campos que se envían juntos.
 */
export function ProductFiltersBar({
  basePath,
  searchParams,
  filters,
  total,
}: ProductFiltersBarProps) {
  const enlace = (cambios: Record<string, string | number | undefined>) =>
    `${basePath}${buildFilterQuery(searchParams, cambios)}`;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4" />
          {total} {total === 1 ? 'producto' : 'productos'}
        </p>

        {hasActiveFilters(filters) && (
          <ButtonLink href={`${basePath}${sinFiltros(searchParams)}`} variant="ghost" size="sm">
            <X className="size-4" />
            Limpiar filtros
          </ButtonLink>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ordenar */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">Ordenar por</p>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opcion) => (
              <ButtonLink
                key={opcion.value}
                href={enlace({ sort: opcion.value })}
                size="sm"
                variant={filters.sort === opcion.value ? 'default' : 'outline'}
              >
                {opcion.label}
              </ButtonLink>
            ))}
          </div>
        </div>

        {/* Precio: formulario GET, porque son dos valores a la vez. */}
        <form action={basePath} method="get" className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">
            Precio ({siteConfig.defaultCurrency})
          </p>

          {/* Los demás filtros viajan como campos ocultos: sin esto,
              enviar un rango de precio borraría el orden y el resto. */}
          {Object.entries(searchParams).map(([clave, valor]) => {
            const v = Array.isArray(valor) ? valor[0] : valor;
            if (!v || clave === 'min' || clave === 'max' || clave === 'page') return null;
            return <input key={clave} type="hidden" name={clave} value={v} />;
          })}

          <div className="flex items-center gap-1.5">
            <Label htmlFor="min-price" className="sr-only">
              Precio mínimo
            </Label>
            <Input
              id="min-price"
              name="min"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Mín."
              defaultValue={filters.minPrice ?? ''}
              className="h-9"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Label htmlFor="max-price" className="sr-only">
              Precio máximo
            </Label>
            <Input
              id="max-price"
              name="max"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Máx."
              defaultValue={filters.maxPrice ?? ''}
              className="h-9"
            />
            {/* Este sí es un botón: envía el formulario, no navega. */}
            <Button type="submit" size="sm" variant="outline">
              Ir
            </Button>
          </div>
        </form>

        {/* Valoración mínima */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">Valoración mínima</p>
          <div className="flex flex-wrap gap-1.5">
            {[4, 3].map((nota) => (
              <ButtonLink
                key={nota}
                href={enlace({ rating: filters.minRating === nota ? undefined : nota })}
                size="sm"
                variant={filters.minRating === nota ? 'default' : 'outline'}
              >
                {nota}★ o más
              </ButtonLink>
            ))}
          </div>
        </div>

        {/* Disponibilidad */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">Disponibilidad</p>
          <ButtonLink
            href={enlace({ stock: filters.inStock ? undefined : '1' })}
            size="sm"
            variant={filters.inStock ? 'default' : 'outline'}
          >
            Solo disponibles
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
