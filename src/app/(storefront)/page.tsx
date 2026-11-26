import { CategoryCard } from '@/components/shared/category-card';
import { HeroCarousel } from '@/components/shared/hero-carousel';
import { siteConfig } from '@/lib/config/site.config';
import { listCategoriesForNav } from '@/lib/services/category.service';
import { getFeaturedProducts } from '@/lib/services/product.service';

// Banners de ejemplo del catálogo semilla — al re-marcar la plantilla,
// reemplaza estas imágenes (y el resto de public/images/brand/) por las tuyas.
const HERO_IMAGES = [
  '/images/brand/portada-1.jpg',
  '/images/brand/portada-2.jpg',
  '/images/brand/portada-3.jpg',
];

/**
 * Portada: el carrusel de banners y, debajo, una sección por categoría de
 * primer nivel con sus presentaciones (imagen, velo negro y nombre). Las
 * secciones alternan tarjetas anchas y altas, sin franja de fondo: solo
 * se ven las presentaciones. «Destacados» cierra con el mismo formato.
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

      {/* Portada a todo el ancho de la ventana, como el carrusel del original:
          sale del contenedor central (`left-1/2` y `-ml-[50vw]`) y pega con
          la cabecera. Conserva la proporción de los banners (1796 × 382)
          para que se vean completos, sin recortar el texto. */}
      <section className="relative left-1/2 -mt-5 -ml-[50vw] aspect-[1796/382] w-screen overflow-hidden">
        <HeroCarousel images={HERO_IMAGES} />
      </section>

      {categories.map((category, index) => {
        const destinos = category.children.length > 0 ? category.children : [category];
        const alta = index % 2 === 1;

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
                alta
                  ? 'mb-10 flex flex-wrap justify-center gap-[25px]'
                  : 'mb-10 flex flex-col justify-center gap-[25px] sm:flex-row'
              }
            >
              {destinos.map((destino) => (
                <CategoryCard
                  key={destino.slug}
                  category={destino}
                  variant={alta ? 'tall' : 'wide'}
                  // Sola en su fila, como mucho media anchura: estirada a
                  // todo el ancho parecería más importante que el resto.
                  className={!alta && destinos.length === 1 ? 'sm:max-w-[50%]' : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}

      {featuredProducts.length > 0 && (
        <section aria-labelledby="seccion-destacados">
          <h2
            id="seccion-destacados"
            className="mt-10 mb-5 text-[1.7rem] leading-[1.3] text-[#333] uppercase lg:text-[2rem]"
          >
            Destacados
          </h2>
          {/* Mismas presentaciones que las categorías: imagen con velo y
              nombre, en filas de tres tarjetas anchas. */}
          <div className="mb-10 grid gap-[25px] sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((producto) => (
              <CategoryCard
                key={producto.slug}
                href={`/producto/${producto.slug}`}
                category={{
                  slug: producto.slug,
                  name: producto.name,
                  image: producto.images[0] ?? null,
                }}
                variant="wide"
                producto
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
