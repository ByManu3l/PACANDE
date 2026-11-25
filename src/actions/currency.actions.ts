'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { siteConfig } from '@/lib/config/site.config';
import { env } from '@/lib/env';
import { COOKIE_MONEDA } from '@/lib/currency-session';
import { runAction } from '@/lib/utils/action-result';
import { ValidationError } from '@/lib/utils/errors';

/**
 * Cambia la moneda en la que se **muestran** los precios.
 *
 * No altera ningún importe: los pedidos se siguen calculando y cobrando
 * en `siteConfig.defaultCurrency`. Ver `exchange-rate.service.ts`.
 *
 * El código recibido se valida contra la lista configurada antes de
 * guardarlo. Sin esa comprobación, cualquiera podría fijar una cookie con
 * un valor arbitrario que después llegaría a `Intl.NumberFormat`.
 */
export async function setDisplayCurrencyAction(moneda: string) {
  return runAction(async () => {
    const permitidas = [siteConfig.defaultCurrency, ...siteConfig.displayCurrencies];
    if (!permitidas.includes(moneda)) {
      throw new ValidationError('Moneda no disponible.');
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_MONEDA, moneda, {
      // Un año: es una preferencia de presentación, no una sesión.
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
    });

    // El precio aparece en casi todas las páginas y se calcula en el
    // servidor, así que hay que rehacer el árbol completo.
    revalidatePath('/', 'layout');

    return { moneda };
  });
}
