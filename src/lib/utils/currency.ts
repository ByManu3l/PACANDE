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
  const value = typeof amount === 'string' ? Number(amount) : amount;

  return new Intl.NumberFormat(siteConfig.locale, {
    style: 'currency',
    currency: siteConfig.defaultCurrency,
  }).format(value);
}
