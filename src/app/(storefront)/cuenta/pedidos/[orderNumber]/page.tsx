import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';
import { getOrderByNumber } from '@/lib/services/order.service';
import { formatPrice } from '@/lib/utils/currency';
import { ORDER_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from '@/lib/utils/order-status';

export default async function OrderDetailPage({
  params,
}: PageProps<'/cuenta/pedidos/[orderNumber]'>) {
  const { orderNumber } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const order = await getOrderByNumber(session.user.id, orderNumber);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedido {order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(order.createdAt).toLocaleString('es-CO')}
          </p>
        </div>
        <Badge variant="secondary">{ORDER_STATUS_LABELS[order.status]}</Badge>
      </div>

      <div className="space-y-2 rounded-lg border p-6">
        <h2 className="mb-2 font-semibold">Productos</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.productName} × {item.quantity}
            </span>
            <span>{formatPrice(item.lineTotal.toString())}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(order.subtotal.toString())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Envío</span>
          <span>{formatPrice(order.shippingCost.toString())}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total.toString())}</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg border p-6">
          <h2 className="mb-2 font-semibold">Dirección de envío</h2>
          <p className="text-sm">{order.shippingRecipientName}</p>
          <p className="text-muted-foreground text-sm">
            {order.shippingLine1}
            {order.shippingLine2 ? `, ${order.shippingLine2}` : ''}
          </p>
          <p className="text-muted-foreground text-sm">
            {order.shippingCity}, {order.shippingRegion}, {order.shippingPostalCode}
          </p>
          <p className="text-muted-foreground text-sm">{order.shippingPhone}</p>
        </div>

        <div className="space-y-1 rounded-lg border p-6">
          <h2 className="mb-2 font-semibold">Envío</h2>
          {order.shipment ? (
            <>
              <Badge variant="secondary">{SHIPMENT_STATUS_LABELS[order.shipment.status]}</Badge>
              {order.shipment.trackingNumber && (
                <p className="text-muted-foreground mt-2 text-sm">
                  Guía: {order.shipment.trackingNumber}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Aún sin información de envío.</p>
          )}
        </div>
      </div>
    </div>
  );
}
