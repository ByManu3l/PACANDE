import { HeartOff } from 'lucide-react';
import Link from 'next/link';

import { BOTON_MUI_ROJO } from '@/components/shared/estilo-original';
import { ProductGrid } from '@/components/shared/product-grid';
import { requireSession } from '@/lib/auth/guards';
import { listWishlist } from '@/lib/services/wishlist.service';

export const metadata = { title: 'Favoritos' };

export default async function FavoritosPage() {
  const user = await requireSession();
  const favoritos = await listWishlist(user.id);

  if (favoritos.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="before:bg-brand flex items-center gap-2.5 text-[1.3rem] font-semibold text-black before:block before:h-6 before:w-1 before:rounded">
          Favoritos
        </h1>

        <div className="text-muted-foreground space-y-3 rounded-lg border border-dashed p-10 text-center">
          <HeartOff className="mx-auto size-8" aria-hidden="true" />
          <p>Todavía no has guardado nada.</p>
          <p className="text-sm">
            Pulsa el corazón de cualquier producto para tenerlo aquí y comprarlo más tarde.
          </p>
          <Link href="/" className={BOTON_MUI_ROJO}>
            Explorar el catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="before:bg-brand flex items-center gap-2.5 text-[1.3rem] font-semibold text-black before:block before:h-6 before:w-1 before:rounded">
          Favoritos
        </h1>
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
