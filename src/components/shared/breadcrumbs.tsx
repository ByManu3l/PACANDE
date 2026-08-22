import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface Crumb {
  label: string;
  /** Ausente en el último, que es la página actual. */
  href?: string;
}

/**
 * Migas de pan.
 *
 * Sirven a dos públicos a la vez. A quien llega desde un buscador le dicen
 * dónde está y le ofrecen subir un nivel en vez de irse; a Google le
 * describen la jerarquía del catálogo, que es lo que hace que muestre la
 * ruta bajo el resultado en lugar de la URL cruda.
 *
 * El último elemento no es un enlace —ya estás ahí— y lleva
 * `aria-current="page"`, que es como un lector de pantalla anuncia la
 * posición actual.
 *
 * Los datos estructurados van aparte, en la propia página, para no
 * duplicar el JSON-LD si estas migas se reutilizan.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, i) => {
          const ultimo = i === items.length - 1;

          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !ultimo ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground font-medium">
                  {item.label}
                </span>
              )}

              {!ultimo && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
