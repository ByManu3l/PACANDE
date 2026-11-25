import { CartItemRow } from '@/components/shared/cart-item-row';
import { CartSummary } from '@/components/shared/cart-summary';
import { ButtonLink } from '@/components/ui/button-link';
import { auth } from '@/lib/auth';
import { getCurrentCart } from '@/lib/cart-session';
import { siteConfig } from '@/lib/config/site.config';
import { cartTotals } from '@/lib/services/cart.service';
import { CurrencyNotice } from '@/components/shared/currency-notice';

export default async function CartPage() {
  const [cart, session] = await Promise.all([getCurrentCart(), auth()]);
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Tu carrito está vacío</h1>
        <ButtonLink href="/">Seguir comprando</ButtonLink>
      </div>
    );
  }

  const { subtotal } = cartTotals(cart!);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Tu carrito</h1>
        <div className="mb-4">
          <CurrencyNotice />
        </div>
        <div>
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={{
                productId: item.productId,
                quantity: item.quantity,
                // Se enumeran los campos en vez de esparcir el producto:
                // `{ ...producto, price: … }` deja pasar cualquier otro
                // `Decimal` que se añada al modelo después, y el error que
                // produce no dice qué campo lo causó. Pasó exactamente eso
                // al añadir `ratingAverage`.
                product: {
                  name: item.product.name,
                  slug: item.product.slug,
                  price: item.product.price.toString(),
                  images: item.product.images,
                  stock: item.product.stock,
                },
              }}
            />
          ))}
        </div>
      </div>

      <CartSummary
        subtotal={subtotal}
        shippingCost={siteConfig.flatShippingCost}
        isAuthenticated={Boolean(session?.user)}
      />
    </div>
  );
}
