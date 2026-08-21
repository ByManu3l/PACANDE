import { listAllOrdersAction } from '@/actions/order.actions';
import { OrdersTable } from '@/components/admin/orders-table';

export default async function AdminOrdersPage() {
  const orders = await listAllOrdersAction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay pedidos.</p>
      ) : (
        <OrdersTable initialOrders={orders} />
      )}
    </div>
  );
}
