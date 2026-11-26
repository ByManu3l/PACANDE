import { PackageX, Store, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { getDashboardStats } from '@/lib/services/dashboard.service';
import { getStockAlerts } from '@/lib/services/stock.service';
import {
  DIAS_DE_COBERTURA_MINIMOS,
  DIAS_DE_VENTAS,
  PRODUCTOS_MINIMOS_POR_SECCION,
  STOCK_MINIMO,
} from '@/lib/utils/stock';

const CARDS = [
  { key: 'products', label: 'Productos', href: '/admin/productos' },
  { key: 'categories', label: 'Categorías', href: '/admin/categorias' },
  { key: 'orders', label: 'Pedidos', href: '/admin/pedidos' },
  { key: 'users', label: 'Usuarios', href: '/admin/usuarios' },
  { key: 'pendingShipments', label: 'Envíos pendientes', href: '/admin/pedidos' },
] as const;

/** Cuántas alertas de producto se listan; el resto se resume en una línea. */
const MAXIMO_EN_LISTA = 10;

export default async function AdminDashboardPage() {
  const [session, stats, { porReponer, seccionesConPocoSurtido }] = await Promise.all([
    auth(),
    getDashboardStats(),
    getStockAlerts(),
  ]);

  return (
    <div className="space-y-8">
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

      <section aria-labelledby="stock-inteligente" className="space-y-4">
        <div>
          <h2 id="stock-inteligente" className="text-xl font-semibold tracking-tight">
            Stock inteligente
          </h2>
          <p className="text-muted-foreground text-sm">
            Avisa cuando un producto tiene {STOCK_MINIMO} unidades o menos, o cuando al ritmo de
            venta de los últimos {DIAS_DE_VENTAS} días no alcanza para {DIAS_DE_COBERTURA_MINIMOS}{' '}
            días. También señala las secciones con menos de {PRODUCTOS_MINIMOS_POR_SECCION}{' '}
            productos disponibles.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageX className="text-primary size-5" aria-hidden="true" />
                Productos por reponer ({porReponer.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {porReponer.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Todo el inventario alcanza. No hay nada que pedir.
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {porReponer.slice(0, MAXIMO_EN_LISTA).map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {p.categoria} · {p.stock} en stock
                          {p.diasDeCobertura !== null &&
                            p.stock > 0 &&
                            ` · alcanza para ${Math.max(1, Math.floor(p.diasDeCobertura))} días`}
                          {p.vendidas > 0 && ` · ${p.vendidas} vendidas en ${DIAS_DE_VENTAS} días`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={p.nivel === 'agotado' ? 'destructive' : 'secondary'}>
                          {p.nivel === 'agotado' ? 'Agotado' : 'Stock bajo'}
                        </Badge>
                        <p className="mt-1 text-xs font-medium">Pide {p.unidadesSugeridas}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {porReponer.length > MAXIMO_EN_LISTA && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Y {porReponer.length - MAXIMO_EN_LISTA} más.{' '}
                  <Link href="/admin/productos" className="text-primary hover:underline">
                    Ver productos
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="text-primary size-5" aria-hidden="true" />
                Secciones con poco surtido ({seccionesConPocoSurtido.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seccionesConPocoSurtido.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Todas las secciones tienen suficientes productos.
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {seccionesConPocoSurtido.map((s) => (
                    <li key={s.slug} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {s.disponibles === 0
                            ? 'Sin productos disponibles: el cliente la ve vacía.'
                            : `Solo ${s.disponibles} ${s.disponibles === 1 ? 'producto disponible' : 'productos disponibles'}.`}{' '}
                          Consigue más productos para esta sección.
                        </p>
                      </div>
                      <TriangleAlert className="text-primary size-4 shrink-0" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
