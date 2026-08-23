'use client';

import { Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteCouponAction } from '@/actions/coupon.actions';
import { CouponFormDialog } from '@/components/admin/coupon-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/currency';

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  /** Texto: viene de un `Decimal` del servidor. */
  value: string;
  minPurchase: string | null;
  maxDiscount: string | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  _count: { orders: number };
}

/**
 * Gestión de cupones.
 *
 * La columna «Estado» no muestra `isActive` a secas: un cupón puede estar
 * activo y aun así no servir porque venció, todavía no empezó o agotó sus
 * usos. Mostrar «Activo» en ese caso llevaría al administrador a buscar el
 * problema en el lado del cliente.
 */
export function CouponsTable({ initialCoupons }: { initialCoupons: CouponRow[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<CouponRow | null>(null);
  const [creando, setCreando] = useState(false);

  const refrescar = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreando(true)}>
          <Plus className="size-4" />
          Nuevo cupón
        </Button>
      </div>

      {initialCoupons.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          Todavía no hay cupones. Crea el primero para lanzar una promoción.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Condiciones</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {initialCoupons.map((cupon) => (
              <TableRow key={cupon.id}>
                <TableCell>
                  <p className="font-mono text-sm font-medium tracking-wider">{cupon.code}</p>
                  {cupon.description && (
                    <p className="text-muted-foreground text-xs">{cupon.description}</p>
                  )}
                </TableCell>

                <TableCell className="text-sm">
                  {cupon.type === 'PERCENTAGE' ? `${cupon.value}%` : formatPrice(cupon.value)}
                  {cupon.maxDiscount && (
                    <p className="text-muted-foreground text-xs">
                      máx. {formatPrice(cupon.maxDiscount)}
                    </p>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground text-xs">
                  {cupon.minPurchase && <p>Desde {formatPrice(cupon.minPurchase)}</p>}
                  {cupon.startsAt && <p>Desde {cupon.startsAt.toLocaleDateString('es')}</p>}
                  {cupon.endsAt && <p>Hasta {cupon.endsAt.toLocaleDateString('es')}</p>}
                  {!cupon.minPurchase && !cupon.startsAt && !cupon.endsAt && <p>Sin condiciones</p>}
                </TableCell>

                <TableCell className="text-sm tabular-nums">
                  {cupon.usedCount}
                  {cupon.maxUses !== null && ` / ${cupon.maxUses}`}
                </TableCell>

                <TableCell>
                  <EstadoDelCupon cupon={cupon} />
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditando(cupon)}
                      aria-label={`Editar el cupón ${cupon.code}`}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <DeleteConfirmDialog
                      itemName={cupon.code}
                      description={
                        cupon._count.orders > 0
                          ? `Este cupón se usó en ${cupon._count.orders} pedido(s), así que no se puede eliminar. Desactívalo para retirarlo de circulación.`
                          : 'Se elimina definitivamente. Los pedidos que lo hayan usado conservan su código y su descuento.'
                      }
                      onConfirm={() => deleteCouponAction(cupon.id)}
                      successMessage="Cupón eliminado."
                      onDeleted={refrescar}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CouponFormDialog
        open={creando}
        onOpenChange={setCreando}
        onSaved={refrescar}
        coupon={null}
      />

      <CouponFormDialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        onSaved={refrescar}
        coupon={editando}
      />
    </div>
  );
}

/**
 * Estado efectivo, no el valor de `isActive`.
 *
 * Un cupón puede estar marcado como activo y aun así ser inaplicable. Esa
 * diferencia es la causa habitual de «el cupón no funciona y no sé por
 * qué», así que se resuelve aquí en vez de dejarla para el soporte.
 */
function EstadoDelCupon({ cupon }: { cupon: CouponRow }) {
  if (!cupon.isActive) return <Badge variant="outline">Desactivado</Badge>;

  const ahora = new Date();
  if (cupon.endsAt && cupon.endsAt < ahora) return <Badge variant="outline">Vencido</Badge>;
  if (cupon.startsAt && cupon.startsAt > ahora)
    return <Badge variant="secondary">Programado</Badge>;
  if (cupon.maxUses !== null && cupon.usedCount >= cupon.maxUses) {
    return <Badge variant="outline">Agotado</Badge>;
  }

  return <Badge>Activo</Badge>;
}
