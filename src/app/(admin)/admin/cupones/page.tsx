import { listCouponsAction } from '@/actions/coupon.actions';
import { CouponsTable } from '@/components/admin/coupons-table';
import { TITULO_ADMIN } from '@/components/shared/estilo-original';

export const metadata = { title: 'Cupones' };

export default async function AdminCouponsPage() {
  const cupones = await listCouponsAction();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className={TITULO_ADMIN}>Cupones</h1>
        <p className="text-muted-foreground text-sm">
          Un cupón usado no se puede eliminar: los pedidos guardan su código, y conservarlo permite
          saber cuánto costó cada campaña. Para retirarlo de circulación, desactívalo.
        </p>
      </div>

      <CouponsTable initialCoupons={cupones} />
    </div>
  );
}
