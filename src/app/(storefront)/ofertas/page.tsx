import { Tag } from 'lucide-react';
import type { Metadata } from 'next';

import { ProductGrid } from '@/components/shared/product-grid';
import { ButtonLink } from '@/components/ui/button-link';
import { getDiscountedProducts } from '@/lib/services/product.service';
import { formatPrice } from '@/lib/utils/currency';
import { ahorroPorDescuento } from '@/lib/utils/discount';

export const metadata: Metadata = {
  title: 'Ofertas',
  description: 'Productos con descuento vigente.',
};

/**
 * Página de ofertas: todo lo que tiene descuento, con la rebaja mayor
 * primero.
 *
 * Las tres cifras de la cabecera se calculan sobre la lista ya cargada,
 * no con una consulta aparte, y **solo se muestran si hay ofertas**. Con
 * la lista vacía, `Math.max()` devuelve `-Infinity` y una media divide
 * entre cero: es exactamente el «Hasta -Infinity% · $NaN» que enseñaba la
 * versión anterior de esta página cuando no había nada rebajado.
 */
export default async function OfertasPage() {
  const productos = await getDiscountedProducts();

  const resumen =
    productos.length > 0
      ? {
          total: productos.length,
          descuentoMaximo: Math.max(...productos.map((p) => p.discountPercent)),
          ahorroMedio:
            productos.reduce(
              (suma, p) => suma + Number(ahorroPorDescuento(p.price, p.discountPercent)),
              0,
            ) / productos.length,
        }
      : null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-neutral-950 px-6 py-10 text-center text-white sm:px-10">
        <h1 className="flex items-center justify-center gap-3 text-3xl font-bold sm:text-4xl">
          <Tag aria-hidden="true" className="size-8 text-red-500" />
          ¡Ofertas especiales!
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-2xl text-white/80">
          Descubre los descuentos vigentes en productos seleccionados.
        </p>

        {resumen && (
          <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-white/5 px-4 py-5">
              <dd className="text-3xl font-bold text-red-500">{resumen.total}</dd>
              <dt className="mt-1 text-sm text-white/70">
                {resumen.total === 1 ? 'Producto en oferta' : 'Productos en oferta'}
              </dt>
            </div>
            <div className="rounded-lg bg-white/5 px-4 py-5">
              <dd className="text-3xl font-bold text-red-500">−{resumen.descuentoMaximo}%</dd>
              <dt className="mt-1 text-sm text-white/70">Descuento máximo</dt>
            </div>
            <div className="rounded-lg bg-white/5 px-4 py-5">
              <dd className="text-3xl font-bold text-red-500">
                {formatPrice(resumen.ahorroMedio)}
              </dd>
              <dt className="mt-1 text-sm text-white/70">Ahorro promedio</dt>
            </div>
          </dl>
        )}
      </section>

      {productos.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Productos en oferta</h2>
          <ProductGrid products={productos} />
        </section>
      ) : (
        <section className="py-12 text-center">
          <h2 className="text-xl font-semibold">Ahora mismo no hay ofertas</h2>
          <p className="text-muted-foreground mt-2">
            Vuelve pronto, o mira el catálogo completo mientras tanto.
          </p>
          <ButtonLink href="/" className="mt-6">
            Ver el catálogo
          </ButtonLink>
        </section>
      )}
    </div>
  );
}
