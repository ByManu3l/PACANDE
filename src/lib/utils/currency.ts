import { siteConfig } from '@/lib/config/site.config';

/**
 * Formatea un importe en la moneda configurada en `site.config.ts`.
 *
 * El locale y la cantidad de decimales salen de la configuración, no están
 * fijos: con `es-CO` + `COP` produce `$ 84.000` (el peso colombiano no usa
 * centavos en la práctica), y con `en-US` + `USD` produce `$10.99` sin que
 * haya que tocar esta función. Fijar `maximumFractionDigits: 0` —como
 * estaba— redondeaba a `$11` en cualquier moneda con centavos, perdiendo
 * dinero en pantalla.
 *
 * Acepta `string` además de `number` porque los importes vienen de
 * columnas `Decimal` de Prisma, que se serializan como cadena al cruzar el
 * límite servidor→cliente.
 */
export function formatPrice(amount: number | string): string {
  return formatPriceIn(amount, siteConfig.defaultCurrency);
}

/**
 * Formatea un importe en una moneda concreta.
 *
 * Existe para la conversión orientativa del escaparate (ver
 * `exchange-rate.service.ts`). **No la uses para importes que se cobran**:
 * esos van siempre en `siteConfig.defaultCurrency`, y para eso está
 * `formatPrice`.
 *
 * Si el código de moneda no es válido, `Intl.NumberFormat` lanza. Se
 * captura y se cae a mostrar el número con el código detrás, porque un
 * precio feo es mejor que una página caída.
 */
export function formatPriceIn(amount: number | string, currency: string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;

  try {
    return new Intl.NumberFormat(siteConfig.locale, {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
