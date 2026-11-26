import { redirect } from 'next/navigation';

import { AdminNav } from '@/components/admin/admin-nav';
import { Footer } from '@/components/shared/footer';
import { Navbar } from '@/components/shared/navbar';
import { auth } from '@/lib/auth';
import { countPendingReviews } from '@/lib/services/review.service';
import { getStockAlerts } from '@/lib/services/stock.service';

// Misma defensa en profundidad que en (storefront)/cuenta/layout.tsx:
// `proxy.ts` ya filtra la navegación a /admin/**, pero un render directo
// de un Server Component no pasa por él. Se comprueba aquí también.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
    redirect('/login');
  }

  // Avisos de trabajo pendiente en el propio menú: opiniones por moderar
  // (sin aprobar no llegan a la ficha) y productos por reponer.
  const [pendientes, { porReponer }] = await Promise.all([countPendingReviews(), getStockAlerts()]);

  const items = [
    { href: '/admin', label: 'Panel' },
    { href: '/admin/categorias', label: 'Categorías' },
    {
      href: '/admin/productos',
      label: 'Productos',
      aviso: {
        cantidad: porReponer.length,
        etiqueta: `${porReponer.length} productos por reponer`,
      },
    },
    { href: '/admin/pedidos', label: 'Pedidos' },
    { href: '/admin/cupones', label: 'Cupones' },
    {
      href: '/admin/resenas',
      label: 'Opiniones',
      aviso: { cantidad: pendientes, etiqueta: `${pendientes} opiniones pendientes de revisar` },
    },
    { href: '/admin/usuarios', label: 'Usuarios' },
  ];

  // La cabecera y el pie de la tienda también en el panel: es la misma
  // página, no otra aplicación.
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip bg-white">
      <Navbar />
      <main className="mx-auto grid w-full max-w-[1440px] flex-1 items-start gap-8 px-5 pt-8 pb-12 md:grid-cols-[240px_1fr]">
        <div className="md:sticky md:top-32">
          <AdminNav items={items} />
        </div>
        <div className="min-w-0">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
