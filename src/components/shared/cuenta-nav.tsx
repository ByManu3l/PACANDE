'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const NAV = [
  { href: '/cuenta', label: 'Perfil' },
  { href: '/cuenta/password', label: 'Contraseña' },
  { href: '/cuenta/pedidos', label: 'Mis pedidos' },
  { href: '/cuenta/favoritos', label: 'Favoritos' },
  { href: '/cuenta/direcciones', label: 'Direcciones' },
];

/**
 * Pestañas de la cuenta. Es un Client Component solo para saber qué
 * pestaña está activa: la activa va en rojo, las demás en negro, como los
 * botones del perfil original.
 */
export function CuentaNav() {
  const ruta = usePathname();

  return (
    <nav aria-label="Secciones de la cuenta" className="flex flex-wrap gap-2">
      {NAV.map((item) => {
        // «Perfil» solo está activo en /cuenta exacto; el resto también en
        // sus subpáginas (el detalle de un pedido sigue en «Mis pedidos»).
        const activo = item.href === '/cuenta' ? ruta === '/cuenta' : ruta.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'focus-visible:ring-brand rounded-lg px-5 py-2.5 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              activo ? 'bg-primary hover:bg-brand-dark' : 'bg-[#555] hover:bg-black',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
