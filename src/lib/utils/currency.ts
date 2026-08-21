import { siteConfig } from '@/lib/config/site.config';

/**
 * Formats a price in the site's single default currency. The legacy
 * frontend had a live multi-currency switcher backed by a free, unkeyed
 * exchange-rate API — fragile for something meant to be a professional
 * template, and not central to what an E-commerce template needs to
 * demonstrate, so it isn't reintroduced here.
 */
export function formatPrice(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: siteConfig.defaultCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}
