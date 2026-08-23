import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';
import { countPendingReviews } from '@/lib/services/review.service';

const NAV = [
  { href: '/admin', label: 'Panel' },
  { href: '/admin/categorias', label: 'Categorías' },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/cupones', label: 'Cupones' },
  { href: '/admin/resenas', label: 'Opiniones' },
  { href: '/admin/usuarios', label: 'Usuarios' },
];

// Misma defensa en profundidad que en (storefront)/cuenta/layout.tsx:
// `proxy.ts` ya filtra la navegación a /admin/**, pero un render directo
// de un Server Component no pasa por él. Se comprueba aquí también.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
    redirect('/login');
  }

  // Aviso de trabajo pendiente en el propio menú. Una cola de moderación
  // que hay que acordarse de visitar se queda sin revisar, y las opiniones
  // sin aprobar no llegan nunca a la ficha del producto.
  const pendientes = await countPendingReviews();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:grid-cols-5">
      <nav className="space-y-1 md:col-span-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:bg-muted flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium"
          >
            {item.label}
            {item.href === '/admin/resenas' && pendientes > 0 && (
              <Badge
                className="h-5 min-w-5 justify-center px-1.5"
                aria-label={`${pendientes} opiniones pendientes de revisar`}
              >
                {pendientes}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
      <div className="md:col-span-4">{children}</div>
    </div>
  );
}
