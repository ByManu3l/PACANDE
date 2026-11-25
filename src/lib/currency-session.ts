import 'server-only';

import { cookies } from 'next/headers';

import { siteConfig } from '@/lib/config/site.config';

export const COOKIE_MONEDA = 'moneda_vista';

/**
 * Moneda en la que el visitante quiere **ver** los precios.
 *
 * Vive en una cookie porque debe sobrevivir a la navegación y estar
 * disponible en el servidor al renderizar: es una preferencia de
 * presentación, no un dato de la cuenta, así que no ocupa sitio en la
 * base ni obliga a iniciar sesión para usarla.
 *
 * El valor se contrasta contra `displayCurrencies` en vez de confiar en
 * la cookie: es entrada del cliente, y una cookie manipulada no debe
 * poder inyectar un código de moneda arbitrario en `Intl.NumberFormat`.
 */
export async function getMonedaDeVista(): Promise<string> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(COOKIE_MONEDA)?.value;

  if (valor && siteConfig.displayCurrencies.includes(valor)) return valor;

  return siteConfig.defaultCurrency;
}
