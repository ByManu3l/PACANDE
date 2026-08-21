import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Panel' },
  { href: '/admin/categorias', label: 'Categorías' },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/usuarios', label: 'Usuarios' },
];

// Same defense-in-depth pattern as (storefront)/cuenta/layout.tsx: middleware
// already gates /admin/**, this catches direct RSC renders too.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
    redirect('/login');
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:grid-cols-5">
      <nav className="space-y-1 md:col-span-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:bg-muted block rounded-lg px-3 py-2 text-sm font-medium"
          >
            {item.label}
          </Link>
        ))}
        {session.user.role === 'SUPERADMIN' && (
          <Link
            href="/admin/superadmin/usuarios"
            className="hover:bg-muted block rounded-lg px-3 py-2 text-sm font-medium"
          >
            Roles (Superadmin)
          </Link>
        )}
      </nav>
      <div className="md:col-span-4">{children}</div>
    </div>
  );
}
