'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { listAllOrdersAction, updateShipmentStatusAction } from '@/actions/order.actions';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/currency';
import { ORDER_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from '@/lib/utils/order-status';

type OrderRow = Awaited<ReturnType<typeof listAllOrdersAction>>[number];

const SHIPMENT_STATUSES = Object.keys(SHIPMENT_STATUS_LABELS) as Array<
  keyof typeof SHIPMENT_STATUS_LABELS
>;

export function OrdersTable({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);

  const refresh = async () => {
    setOrders(await listAllOrdersAction());
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    const result = await updateShipmentStatusAction(
      orderId,
      status as (typeof SHIPMENT_STATUSES)[number],
    );
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Estado de envío actualizado.');
    refresh();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pedido</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Pago</TableHead>
          <TableHead>Envío</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
            <TableCell>
              <div>{order.user.name}</div>
              <div className="text-muted-foreground text-xs">{order.user.email}</div>
            </TableCell>
            <TableCell>{formatPrice(order.total)}</TableCell>
            <TableCell>
              <Badge variant={order.status === 'PAID' ? 'default' : 'secondary'}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </TableCell>
            <TableCell>
              {order.shipment ? (
                <Select
                  value={order.shipment.status}
                  onValueChange={(v) => v && handleStatusChange(order.id, v)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {SHIPMENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-muted-foreground text-xs">Sin envío</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
