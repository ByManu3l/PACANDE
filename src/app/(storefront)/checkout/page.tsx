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
import { CurrencyNotice } from '@/components/shared/currency-notice';
import { TARJETA_MUI } from '@/components/shared/estilo-original';

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
    // Composición del «Finalizar Compra» original: datos de envío y pago a
    // la izquierda y el resumen fijo a la derecha.
    <div className="mx-auto grid max-w-[1200px] gap-6 pt-4 pb-16 md:grid-cols-12">
      <div className="md:col-span-8">
        <h1 className="mb-[0.35em] text-[2.125rem] leading-[1.235] font-normal tracking-[0.00735em] text-[rgba(0,0,0,0.87)]">
          Finalizar Compra
        </h1>
        <div className="mb-6">
          <CurrencyNotice />
        </div>
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

      <div
        className={`${TARJETA_MUI} sticky top-36 h-fit space-y-3 p-4 md:col-span-4 md:mt-[3.2rem]`}
      >
        <h2 className="text-xl font-medium tracking-[0.0075em]">Resumen del Pedido</h2>
        {cart.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-sm">
              {item.product.name} x {item.quantity}
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
        <div className="flex justify-between border-t pt-3 text-xl font-medium">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
