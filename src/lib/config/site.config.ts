/**
 * Identidad de la tienda.
 *
 * Junto con el token `--primary` de `globals.css`, este es el único
 * archivo que hay que editar para re-marcar la plantilla. Ver
 * `docs/PERSONALIZACION.md`.
 *
 * Todo lo que hay aquí es **público**: acaba en el HTML que se envía al
 * navegador. Las claves y secretos van en `.env`, nunca en este archivo.
 */
export interface SiteConfig {
  name: string;
  description: string;
  /** Idioma del contenido, para el atributo `lang` del documento. */
  htmlLang: string;
  /** Código ISO 4217, p. ej. `COP`, `USD`, `MXN`. Determina el símbolo y
   * los decimales que muestra `formatPrice`. */
  defaultCurrency: string;
  /** Locale BCP 47 para formatear precios y fechas, p. ej. `es-CO`,
   * `es-MX`, `en-US`. Debe cambiarse junto con `defaultCurrency`: es lo
   * que decide si se escribe `1.234,56` o `1,234.56`. */
  locale: string;
  /**
   * Monedas en las que el visitante puede **ver** los precios, además de
   * `defaultCurrency`.
   *
   * Son solo una referencia visual: todo pedido se calcula, se cobra y se
   * guarda en `defaultCurrency`. Ver `exchange-rate.service.ts` para el
   * porqué de esa separación. Déjalo vacío para ocultar el selector.
   */
  displayCurrencies: string[];
  /** Se muestra en el pie y en la página de contacto. */
  contactEmail: string;
  contactPhone: string;
  /**
   * Costo de envío fijo, aplicado a todos los pedidos, en la unidad
   * principal de `defaultCurrency` (pesos enteros para COP).
   *
   * Se guarda en cada pedido (`Order.shippingCost`), así que cambiarlo no
   * altera los pedidos ya emitidos. Para reglas más elaboradas —por peso,
   * por región, envío gratis a partir de cierto importe— el punto a tocar
   * es `reserveOrder` en `order.service.ts`.
   */
  flatShippingCost: number;
  /** Las redes que dejes sin definir desaparecen del pie de página. */
  social: {
    facebook?: string;
    instagram?: string;
    x?: string;
  };
}

export const siteConfig: SiteConfig = {
  name: 'Pacandé',
  description: 'Plantilla de E-commerce — moda, tecnología, hogar y deportes en un solo lugar.',
  htmlLang: 'es',
  defaultCurrency: 'COP',
  locale: 'es-CO',
  displayCurrencies: ['USD', 'EUR', 'MXN'],
  contactEmail: 'contacto@pacande.test',
  contactPhone: '+57 300 000 0000',
  flatShippingCost: 10_000,
  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    x: 'https://x.com',
  },
};
