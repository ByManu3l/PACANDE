import Link from 'next/link';

/**
 * 404 de la aplicación, con la pantalla de la versión original: negra a
 * pantalla completa y el «404» enorme en rojo. La alcanzan tanto las URLs
 * inexistentes como las llamadas explícitas a `notFound()` —por ejemplo,
 * un slug de producto o categoría que ya no existe—.
 *
 * A diferencia del original, ofrece salidas: en una tienda, un 404 sin
 * enlaces es una venta perdida.
 */
export default function NotFound() {
  // El fondo negro llega a todo el ancho aunque la página viva dentro del
  // `<main>` acotado de la tienda (cuando una ficha llama a `notFound()`):
  // la sombra de 100vmax pinta los laterales y el `clip-path` impide que
  // se desborde hacia arriba o hacia abajo.
  return (
    <div className="-mt-5 -mb-10 flex min-h-[calc(100vh-112px)] flex-1 flex-col items-center justify-center bg-black px-4 py-16 text-center text-white shadow-[0_0_0_100vmax_#000] [clip-path:inset(0_-100vmax)]">
      <p className="text-brand text-[100px] leading-tight font-bold">404</p>
      <h1 className="my-4 text-2xl">Página no encontrada</h1>
      <p>La página que estás buscando no existe o ha sido movida.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="bg-primary hover:bg-brand-dark px-5 py-2.5 text-white transition-colors duration-300"
        >
          Ir al inicio
        </Link>
        <Link
          href="/buscar"
          className="hover:border-brand hover:text-brand border border-white px-5 py-2.5 text-white transition-colors duration-300"
        >
          Buscar productos
        </Link>
      </div>
    </div>
  );
}
