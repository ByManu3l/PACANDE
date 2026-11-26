'use client';

import { Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  items: { href: string; label: string; aviso?: { cantidad: number; etiqueta: string } }[];
}

/**
 * Menú lateral del panel con el aspecto de la tienda: bloque negro con
 * separadores rojos (la barra lateral de la versión original), la opción
 * activa marcada en rojo y los avisos de trabajo pendiente en píldoras.
 *
 * Es de cliente solo para saber qué opción está activa (`usePathname`).
 */
export function AdminNav({ items }: AdminNavProps) {
  const ruta = usePathname();

  return (
    <nav
      aria-label="Administración"
      className="overflow-hidden rounded-[15px] bg-black text-white shadow-[0_4px_15px_rgba(0,0,0,0.15)]"
    >
      <p className="px-5 pt-5 pb-3 text-xs font-semibold tracking-[2px] text-white/60 uppercase">
        Administración
      </p>
      <ul>
        {items.map((item) => {
          const activa = item.href === '/admin' ? ruta === '/admin' : ruta.startsWith(item.href);
          return (
            <li key={item.href} className="border-t border-[rgba(255,0,0,0.35)]">
              <Link
                href={item.href}
                aria-current={activa ? 'page' : undefined}
                className={`hover:text-brand focus-visible:text-brand flex items-center justify-between gap-2 border-l-4 px-4 py-3 text-[0.95rem] transition-colors duration-300 focus-visible:outline-none ${
                  activa
                    ? 'border-brand bg-[rgba(255,0,0,0.15)] font-semibold'
                    : 'border-transparent'
                }`}
              >
                {item.label}
                {item.aviso && item.aviso.cantidad > 0 && (
                  <span
                    aria-label={item.aviso.etiqueta}
                    className="bg-primary grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold text-white"
                  >
                    {item.aviso.cantidad}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {/* La cabecera de la tienda ya lleva al inicio; este acceso queda al
            final del menú para quien navega solo por el panel. */}
        <li className="border-t border-[rgba(255,0,0,0.35)]">
          <Link
            href="/"
            className="hover:text-brand focus-visible:text-brand flex items-center gap-2 border-l-4 border-transparent px-4 py-3 text-[0.95rem] text-white/80 transition-colors duration-300 focus-visible:outline-none"
          >
            <Store className="size-4" aria-hidden="true" />
            Volver a la tienda
          </Link>
        </li>
      </ul>
    </nav>
  );
}
