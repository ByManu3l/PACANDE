// Placeholder — el catálogo real (hero, categorías, destacados) llega en
// la fase de storefront. Esta página solo confirma que el layout y las
// rutas públicas están cableadas correctamente.
import { siteConfig } from '@/lib/config/site.config';

export default function HomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="text-muted-foreground">{siteConfig.description}</p>
    </div>
  );
}
