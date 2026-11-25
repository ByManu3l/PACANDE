import Link from 'next/link';

import { CartItemRow } from '@/components/shared/cart-item-row';
import { CartSummary } from '@/components/shared/cart-summary';
import { CurrencyNotice } from '@/components/shared/currency-notice';
import { BOTON_MUI_ROJO, TARJETA_MUI } from '@/components/shared/estilo-original';
import { auth } from '@/lib/auth';
import { getCurrentCart } from '@/lib/cart-session';
import { siteConfig } from '@/lib/config/site.config';
import { cartTotals } from '@/lib/services/cart.service';

/**
 * Carrito, con la composición de la versión original: título grande,
 * una tarjeta por producto a la izquierda y el «Resumen del Pedido» a la
 * derecha.
 */
export default async function CartPage() {
  const [cart, session] = await Promise.all([getCurrentCart(), auth()]);
  const items = cart?.items ?? [];

  return (
    <div className="mx-auto max-w-[1200px] pt-4 pb-16">
      <h1 className="mb-[0.35em] text-[2.125rem] leading-[1.235] font-normal tracking-[0.00735em] text-[rgba(0,0,0,0.87)]">
        Carrito de Compras
      </h1>

      {items.length === 0 ? (
        <div className={`${TARJETA_MUI} p-8 text-center`}>
          <h2 className="text-xl font-medium text-[rgba(0,0,0,0.6)]">Tu carrito está vacío</h2>
          <Link href="/" className={`${BOTON_MUI_ROJO} mt-4`}>
            Continuar Comprando
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="space-y-4 md:col-span-8">
            <CurrencyNotice />
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

          <div className="md:col-span-4">
            <CartSummary
              subtotal={cartTotals(cart!).subtotal}
              shippingCost={siteConfig.flatShippingCost}
              isAuthenticated={Boolean(session?.user)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
