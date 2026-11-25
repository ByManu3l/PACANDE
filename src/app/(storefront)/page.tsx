import { CategoryCard } from '@/components/shared/category-card';
import { HeroCarousel } from '@/components/shared/hero-carousel';
import { ProductGrid } from '@/components/shared/product-grid';
import { siteConfig } from '@/lib/config/site.config';
import { listCategoriesForNav } from '@/lib/services/category.service';
import { getFeaturedProducts } from '@/lib/services/product.service';

// Banners de ejemplo del catálogo semilla — al re-marcar la plantilla,
// reemplaza estas imágenes (y el resto de public/images/brand/) por las tuyas.
const HERO_IMAGES = [
  '/images/brand/carrusel-1.jpg',
  '/images/brand/carrusel-2.jpg',
  '/images/brand/carrusel-3.jpg',
];

/**
 * Portada, con la composición de la versión original: el carrusel de
 * banners y, debajo, una sección por categoría de primer nivel que
 * alterna franjas blancas con tarjetas anchas y franjas negras con
 * tarjetas altas. Esa alternancia es lo que daba ritmo a la página.
 *
 * Cada sección lleva directo a las subcategorías: dos clics hasta la hoja
 * del catálogo, sin listado intermedio. Una categoría sin hijas se
 * muestra a sí misma para que ninguna quede fuera de la portada.
 */
export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    listCategoriesForNav(),
    getFeaturedProducts(6),
  ]);

  return (
    <div className="text-center">
      {/* El titular existe para lectores de pantalla y buscadores; a la
          vista, como en el original, la portada empieza por los banners. */}
      <h1 className="sr-only">
        {siteConfig.name} — {siteConfig.description}
      </h1>

      {/* Proporción 7:3, la del carrusel original. */}
      <section className="relative aspect-7/3 w-full overflow-hidden">
        <HeroCarousel images={HERO_IMAGES} />
      </section>

      {categories.map((category, index) => {
        const destinos = category.children.length > 0 ? category.children : [category];
        const franjaNegra = index % 2 === 1;

        return (
          <section key={category.slug} aria-labelledby={`seccion-${category.slug}`}>
            <h2
              id={`seccion-${category.slug}`}
              className="mt-10 mb-5 text-[1.7rem] leading-[1.3] text-[#333] uppercase lg:text-[2rem]"
            >
              {category.name}
            </h2>
            <div
              className={
                franjaNegra
                  ? 'mb-10 flex flex-wrap justify-center gap-[25px] bg-black p-5'
                  : 'mb-10 flex flex-col justify-center gap-[25px] sm:flex-row'
              }
            >
              {destinos.map((destino) => (
                <CategoryCard
                  key={destino.slug}
                  category={destino}
                  variant={franjaNegra ? 'tall' : 'wide'}
                  // Sola en su fila, como mucho media anchura: estirada a
                  // todo el ancho parecería más importante que el resto.
                  className={!franjaNegra && destinos.length === 1 ? 'sm:max-w-[50%]' : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}

      {featuredProducts.length > 0 && (
        <section aria-labelledby="seccion-destacados" className="text-left">
          <h2
            id="seccion-destacados"
            className="mt-10 mb-5 text-center text-[1.7rem] leading-[1.3] text-[#333] uppercase lg:text-[2rem]"
          >
            Destacados
          </h2>
          <ProductGrid products={featuredProducts} prioritizeFirst={false} />
        </section>
      )}
    </div>
  );
}
