import { redirect } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/lib/auth';

const NAV = [
  { href: '/cuenta', label: 'Perfil' },
  { href: '/cuenta/password', label: 'Contraseña' },
  { href: '/cuenta/pedidos', label: 'Mis pedidos' },
];

// middleware.ts already redirects unauthenticated visits away from
// /cuenta/**; this is the same defense-in-depth check applied at the
// layout level (using redirect(), not the throwing requireSession() that
// Server Actions use) so a direct RSC render can never skip it either.
export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-8 md:grid-cols-4">
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
      </nav>
      <div className="md:col-span-3">{children}</div>
    </div>
  );
}
