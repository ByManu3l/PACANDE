import { redirect } from 'next/navigation';

import { getCurrentCart } from '@/lib/cart-session';
import { CheckoutForm } from '@/components/forms/checkout-form';
import { cartTotals } from '@/lib/services/cart.service';
import { formatPrice } from '@/lib/utils/currency';
import { siteConfig } from '@/lib/config/site.config';

export default async function CheckoutPage() {
  const cart = await getCurrentCart();
  if (!cart || cart.items.length === 0) {
    redirect('/carrito');
  }

  const { subtotal } = cartTotals(cart);
  const total = subtotal + siteConfig.flatShippingCost;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
        <CheckoutForm />
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
