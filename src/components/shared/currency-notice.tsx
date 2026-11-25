import { siteConfig } from '@/lib/config/site.config';
import { getMonedaDeVista } from '@/lib/currency-session';

/**
 * Aviso de en qué moneda se cobra, cuando el visitante está viendo los
 * precios en otra.
 *
 * Va en el carrito y en el checkout, que es donde se decide pagar. No es
 * un detalle de cortesía: quien ha estado navegando en dólares tiene que
 * saber, **antes** de introducir una tarjeta, que el cargo llegará en la
 * moneda de la tienda y que su banco aplicará su propia conversión. Sin
 * este aviso, la diferencia entre lo que creyó pagar y lo que aparece en
 * su extracto es una reclamación, y con razón.
 *
 * Si está viendo los precios en la moneda de cobro, no se muestra nada:
 * un aviso que sobra acaba ignorándose también cuando importa.
 */
export async function CurrencyNotice() {
  const moneda = await getMonedaDeVista();

  if (moneda === siteConfig.defaultCurrency) return null;

  return (
    <p
      role="note"
      className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm"
    >
      Estás viendo los precios convertidos a <strong>{moneda}</strong> como referencia. El cobro se
      realiza en <strong>{siteConfig.defaultCurrency}</strong>; el importe final en tu moneda lo
      determina tu banco al aplicar su propia tasa.
    </p>
  );
}
