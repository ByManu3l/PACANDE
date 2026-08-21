import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';
import { listOrdersForUser } from '@/lib/services/order.service';
import { formatPrice } from '@/lib/utils/currency';
import { ORDER_STATUS_LABELS } from '@/lib/utils/order-status';

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const orders = await listOrdersForUser(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mis pedidos</h1>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Todavía no tienes pedidos.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/cuenta/pedidos/${order.orderNumber}`}
              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-mono text-sm">{order.orderNumber}</p>
                <p className="text-muted-foreground text-sm">
                  {new Date(order.createdAt).toLocaleDateString('es-CO')} · {order.items.length}{' '}
                  producto(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatPrice(order.total.toString())}</span>
                <Badge variant="secondary">{ORDER_STATUS_LABELS[order.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
