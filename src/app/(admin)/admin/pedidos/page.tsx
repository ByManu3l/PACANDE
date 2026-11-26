import { listAllOrdersAction } from '@/actions/order.actions';
import { OrdersTable } from '@/components/admin/orders-table';
import { PaginationNav } from '@/components/shared/pagination-nav';
import { parsePageParam } from '@/lib/utils/pagination';
import { TITULO_ADMIN } from '@/components/shared/estilo-original';

export const metadata = { title: 'Pedidos' };

export default async function AdminOrdersPage({ searchParams }: PageProps<'/admin/pedidos'>) {
  const { page } = await searchParams;
  const pedidos = await listAllOrdersAction(parsePageParam(page));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className={TITULO_ADMIN}>Pedidos</h1>
        {pedidos.total > 0 && (
          <p className="text-muted-foreground text-sm">
            {pedidos.total} {pedidos.total === 1 ? 'pedido' : 'pedidos'}
          </p>
        )}
      </div>

      {pedidos.total === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          Todavía no hay pedidos.
        </p>
      ) : (
        <>
          <OrdersTable initialOrders={pedidos.items} page={pedidos.page} />
          <PaginationNav
            page={pedidos.page}
            pageCount={pedidos.pageCount}
            basePath="/admin/pedidos"
          />
        </>
      )}
    </div>
  );
}
