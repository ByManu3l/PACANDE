'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { clearCartAction } from '@/actions/cart.actions';

import { type CuponAplicado, CouponForm } from '@/components/forms/coupon-form';
import {
  BOTON_MUI_CONTORNO,
  BOTON_MUI_ROJO,
  TARJETA_MUI,
} from '@/components/shared/estilo-original';
import { formatPrice } from '@/lib/utils/currency';

interface CartSummaryProps {
  subtotal: number;
  shippingCost: number;
  isAuthenticated: boolean;
}

/**
 * Resumen del carrito, con el cupón.
 *
 * Es de cliente porque el cupón aplicado es estado local: se aplica y se
 * quita sin recargar. Ese estado **no se persiste** a propósito — el
 * cupón viaja al servidor como parte del checkout, y allí se revalida.
 * Guardarlo en base de datos obligaría a mantenerlo sincronizado con un
 * carrito que cambia, sin ganar nada.
 *
 * El código elegido se pasa al checkout por la URL. Es visible, y está
 * bien que lo sea: no es un secreto, y el servidor lo recalcula igual.
 */
export function CartSummary({ subtotal, shippingCost, isAuthenticated }: CartSummaryProps) {
  const [cupon, setCupon] = useState<CuponAplicado | null>(null);
  const [vaciando, startTransition] = useTransition();
  const router = useRouter();

  const descuento = cupon ? Number(cupon.discount) : 0;
  const total = subtotal - descuento + shippingCost;

  const enlaceCheckout = cupon ? `/checkout?cupon=${encodeURIComponent(cupon.code)}` : '/checkout';

  return (
    // «Resumen del Pedido» de la versión original: tarjeta blanca, filas
    // separadas por divisores y los dos botones a todo el ancho.
    <div className={`${TARJETA_MUI} h-fit space-y-4 p-4`}>
      <h2 className="text-xl leading-[1.6] font-medium tracking-[0.0075em]">Resumen del Pedido</h2>
      <hr className="border-[rgba(0,0,0,0.12)]" />

      <div className="space-y-4">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="tabular-nums">{formatPrice(subtotal)}</span>
        </div>

        {cupon && (
          <div className="flex justify-between text-green-700">
            <span>Descuento ({cupon.code}):</span>
            <span className="tabular-nums">−{formatPrice(descuento)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Envío:</span>
          <span className="tabular-nums">{formatPrice(shippingCost)}</span>
        </div>
      </div>

      <hr className="border-[rgba(0,0,0,0.12)]" />
      <div className="flex justify-between text-xl font-medium">
        <span>Total:</span>
        <span className="tabular-nums">{formatPrice(total)}</span>
      </div>

      <CouponForm onChange={setCupon} applied={cupon} isAuthenticated={isAuthenticated} />

      <Link href={enlaceCheckout} className={`${BOTON_MUI_ROJO} w-full`}>
        Proceder al Pago
      </Link>
      <button
        type="button"
        disabled={vaciando}
        onClick={() =>
          startTransition(async () => {
            const resultado = await clearCartAction();
            if (!resultado.success) {
              toast.error(resultado.error);
              return;
            }
            toast.success('Carrito vaciado');
            router.refresh();
          })
        }
        className={`${BOTON_MUI_CONTORNO} w-full`}
      >
        {vaciando ? 'Vaciando…' : 'Vaciar Carrito'}
      </button>
    </div>
  );
}
