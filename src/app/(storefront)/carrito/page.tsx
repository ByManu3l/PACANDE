import Link from 'next/link';

import { getCurrentCart } from '@/lib/cart-session';
import { CartItemRow } from '@/components/shared/cart-item-row';
import { Button } from '@/components/ui/button';
import { cartTotals } from '@/lib/services/cart.service';
import { formatPrice } from '@/lib/utils/currency';

export default async function CartPage() {
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Tu carrito está vacío</h1>
        <Button render={<Link href="/" />} nativeButton={false}>
          Seguir comprando
        </Button>
      </div>
    );
  }

  const { subtotal } = cartTotals(cart!);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Tu carrito</h1>
        <div>
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={{
                productId: item.productId,
                quantity: item.quantity,
                product: { ...item.product, price: item.product.price.toString() },
              }}
            />
          ))}
        </div>
      </div>

      <div className="bg-muted/40 h-fit space-y-4 rounded-lg border p-6">
        <h2 className="font-semibold">Resumen</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          El costo de envío se calcula en el siguiente paso.
        </p>
        <Button render={<Link href="/checkout" />} nativeButton={false} className="w-full">
          Proceder al pago
        </Button>
      </div>
    </div>
  );
}
