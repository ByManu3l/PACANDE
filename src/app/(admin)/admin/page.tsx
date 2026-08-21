import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { getDashboardStats } from '@/lib/services/dashboard.service';

const CARDS = [
  { key: 'products', label: 'Productos', href: '/admin/productos' },
  { key: 'categories', label: 'Categorías', href: '/admin/categorias' },
  { key: 'orders', label: 'Pedidos', href: '/admin/pedidos' },
  { key: 'users', label: 'Usuarios', href: '/admin/usuarios' },
  { key: 'pendingShipments', label: 'Envíos pendientes', href: '/admin/pedidos' },
] as const;

export default async function AdminDashboardPage() {
  const [session, stats] = await Promise.all([auth(), getDashboardStats()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de administración</h1>
        <p className="text-muted-foreground">
          Sesión: {session?.user?.name} — rol: {session?.user?.role}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((card) => (
          <Link key={card.key} href={card.href}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="text-3xl">{stats[card.key]}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{card.label}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
