import { CategoryCard } from '@/components/shared/category-card';
import { HeroCarousel } from '@/components/shared/hero-carousel';
import { ProductGrid } from '@/components/shared/product-grid';
import { ButtonLink } from '@/components/ui/button-link';
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

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    listCategoriesForNav(),
    getFeaturedProducts(8),
  ]);

  return (
    <div className="space-y-12">
      {/* A sangre completa: se sale del ancho del `<main>` para ocupar todo
          el viewport, como el carrusel de portada. El `overflow-x-clip` del
          layout evita que el desbordamiento genere scroll horizontal. */}
      <section className="relative left-1/2 -mt-8 aspect-3/2 max-h-[560px] w-screen -translate-x-1/2 overflow-hidden sm:aspect-21/9">
        <HeroCarousel images={HERO_IMAGES}>
          <div className="pointer-events-none absolute inset-0 flex items-center">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 sm:px-8">
              <h1 className="max-w-md text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
                {siteConfig.name}
              </h1>
              <p className="max-w-md text-white/90 drop-shadow sm:text-lg">
                {siteConfig.description}
              </p>
              {/* El contenedor ignora el puntero para no tapar las flechas
                  del carrusel; el botón lo vuelve a activar para sí mismo. */}
              <ButtonLink href="#categorias" size="lg" className="pointer-events-auto">
                Explorar catálogo
              </ButtonLink>
            </div>
          </div>
        </HeroCarousel>
      </section>

      {/* Una sección por categoría de primer nivel, con sus subcategorías
          en tarjetas grandes: es la estructura de la portada original, y
          lleva en dos clics a la hoja del catálogo en vez de a un listado
          intermedio. Las categorías sin hijos —Variedad— se muestran ellas
          mismas para que ninguna quede fuera de la portada. */}
      <div id="categorias" className="space-y-12">
        {categories.map((category) => {
          const destinos = category.children.length > 0 ? category.children : [category];

          return (
            <section key={category.slug} className="space-y-4">
              <h2 className="text-center text-2xl font-semibold tracking-[0.2em] uppercase">
                {category.name}
              </h2>
              {/* Tres columnas siempre: una categoría sin hijos —Variedad—
                  ocupa una sola celda en vez de estirarse a todo el ancho,
                  que la haría parecer más importante que Ropa o Deportes. */}
              <div
                className={`grid gap-4 ${
                  destinos.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {destinos.map((destino) => (
                  <CategoryCard key={destino.slug} category={destino} size="lg" />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {featuredProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Destacados</h2>
          <ProductGrid products={featuredProducts} prioritizeFirst={false} />
        </section>
      )}
    </div>
  );
}
