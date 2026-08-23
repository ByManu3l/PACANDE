'use client';

import { useState } from 'react';

import { type CuponAplicado, CouponForm } from '@/components/forms/coupon-form';
import { ButtonLink } from '@/components/ui/button-link';
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

  const descuento = cupon ? Number(cupon.discount) : 0;
  const total = subtotal - descuento + shippingCost;

  const enlaceCheckout = cupon ? `/checkout?cupon=${encodeURIComponent(cupon.code)}` : '/checkout';

  return (
    <div className="bg-muted/40 h-fit space-y-4 rounded-lg border p-6">
      <h2 className="font-semibold">Resumen</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatPrice(subtotal)}</span>
        </div>

        {cupon && (
          <div className="flex justify-between text-green-700 dark:text-green-500">
            <span>Descuento ({cupon.code})</span>
            <span className="tabular-nums">−{formatPrice(descuento)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="tabular-nums">{formatPrice(shippingCost)}</span>
        </div>

        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
      </div>

      <CouponForm onChange={setCupon} applied={cupon} isAuthenticated={isAuthenticated} />

      <ButtonLink href={enlaceCheckout} className="w-full">
        Proceder al pago
      </ButtonLink>
    </div>
  );
}
