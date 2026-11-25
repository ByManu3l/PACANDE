import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { OrderStatus } from '@/generated/prisma/client';
import { auth } from '@/lib/auth';
import { listOrdersForUser } from '@/lib/services/order.service';
import { formatPrice } from '@/lib/utils/currency';
import { ORDER_STATUS_LABELS } from '@/lib/utils/order-status';

/**
 * Colores de estado de «Mis Envíos» en la versión original (verde,
 * azul, amarillo, rojo), oscurecidos lo justo para que el texto blanco
 * —o negro sobre el amarillo— pase el contraste mínimo.
 */
const COLOR_ESTADO: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-[#ffc107] text-black',
  PAID: 'bg-[#0062cc] text-white',
  COMPLETED: 'bg-[#1e7e34] text-white',
  CANCELLED: 'bg-[#c82333] text-white',
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const orders = await listOrdersForUser(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="before:bg-brand flex items-center gap-2.5 text-[1.3rem] font-semibold text-black before:block before:h-6 before:w-1 before:rounded">
        Mis pedidos
      </h1>

      {orders.length === 0 ? (
        <p className="text-[#666]">Todavía no tienes pedidos.</p>
      ) : (
        <ul className="space-y-5">
          {orders.map((order) => (
            // La tarjeta de envío original: cabecera negra con el número
            // y el estado, y debajo los datos en rejilla.
            <li key={order.id}>
              <Link
                href={`/cuenta/pedidos/${order.orderNumber}`}
                className="group focus-visible:ring-brand block overflow-hidden rounded-xl bg-white shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-black px-5 py-[15px] text-white">
                  <span className="font-mono">Pedido {order.orderNumber}</span>
                  <span
                    className={`rounded-[20px] px-3 py-1.5 text-[0.85em] font-medium uppercase ${COLOR_ESTADO[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <dl className="grid gap-4 p-5 sm:grid-cols-3">
                  <Dato etiqueta="Fecha">
                    {new Date(order.createdAt).toLocaleDateString('es-CO')}
                  </Dato>
                  <Dato etiqueta="Productos">{order.items.length}</Dato>
                  <Dato etiqueta="Total">{formatPrice(order.total.toString())}</Dato>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <dt className="text-[0.9em] text-[#666]">{etiqueta}</dt>
      <dd className="font-medium text-[#2c3e50]">{children}</dd>
    </div>
  );
}
