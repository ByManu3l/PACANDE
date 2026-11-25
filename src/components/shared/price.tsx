import { siteConfig } from '@/lib/config/site.config';
import { getMonedaDeVista } from '@/lib/currency-session';
import { convertirImporte, getExchangeRates } from '@/lib/services/exchange-rate.service';
import { formatPrice, formatPriceIn } from '@/lib/utils/currency';

interface PriceProps {
  /** Importe en la moneda de cobro (`siteConfig.defaultCurrency`). */
  amount: number | string;
  className?: string;
}

/**
 * Precio de un producto, con su equivalencia si el visitante eligió otra
 * moneda.
 *
 * **El importe de cobro siempre va primero y sin adornos**; la conversión
 * va detrás, en gris, precedida de «≈» y con su código de moneda. Ese
 * orden no es estético: quien compra tiene que poder ver de un vistazo la
 * cifra exacta que le van a cobrar, y la referencia no debe poder
 * confundirse con ella.
 */
export async function Price({ amount, className }: PriceProps) {
  const moneda = await getMonedaDeVista();
  const esMonedaBase = moneda === siteConfig.defaultCurrency;

  const { tasas } = esMonedaBase ? { tasas: {} } : await getExchangeRates();
  const convertido = esMonedaBase ? null : convertirImporte(amount, moneda, tasas);

  return (
    <span className={className}>
      <span className="font-bold">{formatPrice(amount)}</span>
      {convertido !== null && (
        <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
          ≈ {formatPriceIn(convertido, moneda)}
        </span>
      )}
    </span>
  );
}
