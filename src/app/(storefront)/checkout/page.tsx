import { redirect } from 'next/navigation';

import { Prisma } from '@/generated/prisma/client';
import { requireSession } from '@/lib/auth/guards';
import { getCurrentCart } from '@/lib/cart-session';
import { listAddresses } from '@/lib/services/address.service';
import { validateCoupon } from '@/lib/services/coupon.service';
import { CheckoutForm } from '@/components/forms/checkout-form';
import { cartTotals } from '@/lib/services/cart.service';
import { formatPrice } from '@/lib/utils/currency';
import { siteConfig } from '@/lib/config/site.config';

export default async function CheckoutPage({ searchParams }: PageProps<'/checkout'>) {
  const [cart, sp, user] = await Promise.all([getCurrentCart(), searchParams, requireSession()]);
  const direcciones = await listAddresses(user.id);
  if (!cart || cart.items.length === 0) {
    redirect('/carrito');
  }

  const { subtotal } = cartTotals(cart);
  const couponCode = typeof sp.cupon === 'string' ? sp.cupon : undefined;

  // El descuento se revalida y se recalcula en el servidor al confirmar la
  // compra; esto solo es la vista previa del resumen.
  const cupon = couponCode
    ? await validateCoupon(couponCode, new Prisma.Decimal(subtotal)).catch(() => null)
    : null;

  const descuento = cupon ? Number(cupon.discount) : 0;
  const total = subtotal - descuento + siteConfig.flatShippingCost;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
        <CheckoutForm
          couponCode={cupon?.code}
          direcciones={direcciones.map((d) => ({
            id: d.id,
            label: d.label,
            recipientName: d.recipientName,
            line1: d.line1,
            line2: d.line2 ?? undefined,
            city: d.city,
            region: d.region,
            postalCode: d.postalCode,
            country: d.country,
            phone: d.phone,
          }))}
        />
      </div>

      <div className="bg-muted/40 h-fit space-y-3 rounded-lg border p-6">
        <h2 className="font-semibold">Resumen del pedido</h2>
        {cart.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.product.name} × {item.quantity}
            </span>
            <span>{formatPrice(Number(item.product.price) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {cupon && (
          <div className="flex justify-between text-sm text-green-700 dark:text-green-500">
            <span>Descuento ({cupon.code})</span>
            <span>−{formatPrice(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Envío</span>
          <span>{formatPrice(siteConfig.flatShippingCost)}</span>
        </div>
        <div className="flex justify-between border-t pt-3 font-semibold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
