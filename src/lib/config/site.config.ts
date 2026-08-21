/**
 * The one file (plus the palette in globals.css) a new project built from
 * this template needs to edit to re-brand it — name, currency, contact
 * details. Everything here is public, non-secret content; secrets belong
 * in .env instead.
 */
export interface SiteConfig {
  name: string;
  description: string;
  defaultCurrency: string;
  currencySymbol: string;
  contactEmail: string;
  contactPhone: string;
  /** Flat shipping cost applied to every order, in the smallest display
   * unit of defaultCurrency (e.g. whole pesos for COP). */
  flatShippingCost: number;
  social: {
    facebook?: string;
    instagram?: string;
    x?: string;
  };
}

export const siteConfig: SiteConfig = {
  name: 'Pacandé',
  description: 'Plantilla de E-commerce — moda, tecnología, hogar y deportes en un solo lugar.',
  defaultCurrency: 'COP',
  currencySymbol: '$',
  contactEmail: 'contacto@pacande.test',
  contactPhone: '+57 300 000 0000',
  flatShippingCost: 10_000,
  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    x: 'https://x.com',
  },
};
