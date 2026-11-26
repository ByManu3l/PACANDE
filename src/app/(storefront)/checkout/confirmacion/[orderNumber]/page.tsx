import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { BOTON_MUI_CONTORNO, BOTON_MUI_ROJO } from '@/components/shared/estilo-original';
import { auth } from '@/lib/auth';
import { getOrderByNumber } from '@/lib/services/order.service';
import { formatPrice } from '@/lib/utils/currency';

export default async function OrderConfirmationPage({
  params,
}: PageProps<'/checkout/confirmacion/[orderNumber]'>) {
  const { orderNumber } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const order = await getOrderByNumber(session.user.id, orderNumber);
  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <CheckCircle2 className="text-primary mx-auto size-16" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">¡Gracias por tu compra!</h1>
        <p className="text-muted-foreground mt-1">
          Pedido <span className="font-mono">{order.orderNumber}</span>
        </p>
      </div>

      <div className="space-y-2 rounded-lg border p-6 text-left">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.productName} × {item.quantity}
            </span>
            <span>{formatPrice(item.lineTotal.toString())}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total.toString())}</span>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Link href="/cuenta/pedidos" className={BOTON_MUI_CONTORNO}>
          Ver mis pedidos
        </Link>
        <Link href="/" className={BOTON_MUI_ROJO}>
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
