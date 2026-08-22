import { redirect } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/lib/auth';

const NAV = [
  { href: '/cuenta', label: 'Perfil' },
  { href: '/cuenta/password', label: 'Contraseña' },
  { href: '/cuenta/pedidos', label: 'Mis pedidos' },
];

// `proxy.ts` ya redirige las visitas sin sesión fuera de /cuenta/**.
// Esta es la misma comprobación aplicada en el layout, para que un render
// directo de Server Component tampoco pueda saltársela.
//
// Aquí se usa `redirect()` y no el `requireSession()` que lanza: en una
// página, lo correcto es llevar al visitante al login; lanzar mostraría
// una pantalla de error para algo que no lo es.
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
