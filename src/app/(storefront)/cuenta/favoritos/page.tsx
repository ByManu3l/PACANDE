import { HeartOff } from 'lucide-react';

import { ProductGrid } from '@/components/shared/product-grid';
import { ButtonLink } from '@/components/ui/button-link';
import { requireSession } from '@/lib/auth/guards';
import { listWishlist } from '@/lib/services/wishlist.service';

export const metadata = { title: 'Favoritos' };

export default async function FavoritosPage() {
  const user = await requireSession();
  const favoritos = await listWishlist(user.id);

  if (favoritos.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Favoritos</h1>

        <div className="text-muted-foreground space-y-3 rounded-lg border border-dashed p-10 text-center">
          <HeartOff className="mx-auto size-8" aria-hidden="true" />
          <p>Todavía no has guardado nada.</p>
          <p className="text-sm">
            Pulsa el corazón de cualquier producto para tenerlo aquí y comprarlo más tarde.
          </p>
          <ButtonLink href="/" variant="outline" size="sm">
            Explorar el catálogo
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Favoritos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {favoritos.length} {favoritos.length === 1 ? 'producto guardado' : 'productos guardados'}
        </p>
      </div>

      {/* Los productos retirados del catálogo no llegan aquí: el servicio
          los filtra, porque enseñarlos llevaría a una ficha inexistente. */}
      <ProductGrid products={favoritos.map((f) => f.product)} />
    </div>
  );
}
