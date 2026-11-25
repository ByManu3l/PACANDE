import { Percent, ShoppingCart, Tag } from 'lucide-react';
import type { Metadata } from 'next';

import { ProductGrid } from '@/components/shared/product-grid';
import { formatPrice } from '@/lib/utils/currency';
import { getDiscountedProducts } from '@/lib/services/product.service';
import { ahorroPorDescuento } from '@/lib/utils/discount';

export const metadata: Metadata = {
  title: 'Ofertas',
  description: 'Productos con descuento vigente.',
};

/**
 * Página de ofertas: todo lo que tiene descuento, con la rebaja mayor
 * primero. Con la cabecera de la versión original: negra, con un halo
 * rojo que late detrás, el titular en degradado de blanco a rojo y las
 * tres cifras en cristal esmerilado.
 *
 * Las tres cifras se calculan sobre la lista ya cargada, no con una
 * consulta aparte, y **solo se muestran si hay ofertas**. Con la lista
 * vacía, `Math.max()` devuelve `-Infinity` y una media divide entre cero:
 * es exactamente el «Hasta -Infinity% · $NaN» que enseñaba una versión
 * anterior de esta página cuando no había nada rebajado.
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
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[15px] bg-linear-135 from-black to-[#1a1a1a] px-5 py-[60px] text-center text-white shadow-[0_4px_25px_rgba(255,0,0,0.15)] sm:px-10">
        {/* Halo rojo que late detrás del titular. Decorativo, y quieto
            para quien pidió menos movimiento en su sistema. */}
        <div
          aria-hidden="true"
          className="absolute -top-1/2 -left-1/2 size-[200%] animate-[pulso_4s_linear_infinite] bg-[radial-gradient(circle,rgba(255,0,0,0.1)_0%,transparent_60%)] motion-reduce:animate-none"
        />

        <div className="relative">
          <h1 className="mb-5 flex flex-wrap items-center justify-center gap-[15px] text-[2.2rem] font-extrabold tracking-[3px] uppercase sm:text-[3.5rem]">
            <Tag aria-hidden="true" className="text-brand size-10 fill-current sm:size-12" />
            <span className="bg-linear-45 from-white to-[#ff0000] bg-clip-text text-transparent">
              ¡Ofertas Especiales!
            </span>
            <Percent aria-hidden="true" className="text-brand size-10 sm:size-12" />
          </h1>
          <p className="mx-auto mt-5 max-w-[800px] text-[1.15rem] leading-relaxed opacity-90 sm:text-[1.4rem]">
            Descubre increíbles descuentos en nuestros productos seleccionados. ¡No te pierdas estas
            oportunidades únicas para ahorrar!
          </p>

          {resumen && (
            <dl className="mt-[30px] flex flex-wrap justify-center gap-5 sm:gap-10">
              <Cifra valor={String(resumen.total)} etiqueta="Productos en Oferta" />
              <Cifra valor={`Hasta ${resumen.descuentoMaximo}%`} etiqueta="De Descuento" />
              <Cifra valor={formatPrice(resumen.ahorroMedio)} etiqueta="Ahorro Promedio" />
            </dl>
          )}
        </div>
      </section>

      <section className="rounded-[15px] bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.05)] sm:p-10">
        <h2 className="relative mb-10 pb-2.5 text-center text-[2rem] font-bold text-black after:absolute after:bottom-0 after:left-1/2 after:h-1 after:w-[100px] after:-translate-x-1/2 after:rounded-sm after:bg-linear-to-r after:from-[#ff0000] after:to-[#ff4444] after:content-[''] sm:text-[2.5rem]">
          Productos en Oferta
        </h2>

        {productos.length > 0 ? (
          <ProductGrid products={productos} />
        ) : (
          <div className="p-10 text-center">
            <ShoppingCart aria-hidden="true" className="mx-auto size-[50px] text-[#ddd]" />
            <h3 className="mt-5 text-xl text-[#333]">No hay ofertas disponibles</h3>
            <p className="text-[#666]">¡Vuelve pronto para encontrar nuevas ofertas increíbles!</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="flex flex-col-reverse rounded-[10px] bg-white/10 px-[25px] py-[15px] backdrop-blur-[5px]">
      <dt className="mt-[5px] opacity-80">{etiqueta}</dt>
      <dd className="text-brand text-[2rem] font-bold">{valor}</dd>
    </div>
  );
}
