import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { siteConfig } from '@/lib/config/site.config';
import { env } from '@/lib/env';

import './globals.css';

/**
 * Metadatos base que heredan todas las páginas.
 *
 * - `title.template` hace que cada página solo declare su propia parte
 *   («Camiseta Roja») y se le añada el nombre de la tienda de site.config.
 * - `metadataBase` es obligatorio para que las URLs de Open Graph salgan
 *   absolutas; sin él, al compartir un producto la miniatura no carga.
 *   En despliegue debe apuntar al dominio real vía `NEXT_PUBLIC_SITE_URL`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang={siteConfig.htmlLang} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
