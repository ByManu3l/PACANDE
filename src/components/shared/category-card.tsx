import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: { slug: string; name: string; image: string | null; description?: string | null };
  /**
   * Las tres tarjetas de la versión original:
   *
   * - `wide`: franjas blancas de la portada. Imagen a sangre con velo
   *   negro al 50 % y el nombre enorme en el centro.
   * - `tall`: franjas negras de la portada. La misma idea en vertical,
   *   300 × 550 px.
   * - `main` (por defecto): página de una categoría con subcategorías.
   *   Esquinas redondeadas, degradado oscuro y el nombre con una frase
   *   de la descripción al pie.
   */
  variant?: 'wide' | 'tall' | 'main';
  className?: string;
}

/** La primera frase de la descripción: el resto queda para la cabecera
 * de la propia categoría. */
function primeraFrase(texto: string) {
  const fin = texto.indexOf('. ');
  return fin === -1 ? texto.replace(/\.$/, '') : texto.slice(0, fin);
}

export function CategoryCard({ category, variant = 'main', className }: CategoryCardProps) {
  if (variant === 'main') {
    return (
      <Link
        href={`/categoria/${category.slug}`}
        className={cn(
          'group relative block h-[300px] overflow-hidden rounded-xl text-white shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-[5px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.2)]',
          className,
        )}
      >
        {category.image && (
          <Image
            src={category.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/90 to-black/70 p-[25px] text-center transition-colors duration-300 group-hover:from-black/95 group-hover:to-black/80">
          <h3 className="text-[2em] leading-tight font-bold tracking-[1px] text-white uppercase [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]">
            {category.name}
          </h3>
          {category.description && (
            <p className="mx-auto mt-[15px] max-w-[80%] text-[1.1em] leading-snug [text-shadow:1px_1px_3px_rgba(0,0,0,0.5)]">
              {primeraFrase(category.description)}
            </p>
          )}
        </div>
      </Link>
    );
  }

  const alta = variant === 'tall';

  return (
    <Link
      href={`/categoria/${category.slug}`}
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-neutral-800 bg-cover bg-center transition-transform duration-300 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none',
        alta
          ? 'h-[420px] w-full sm:h-[650px] sm:w-[400px]'
          : 'h-[220px] w-full sm:h-[300px] sm:flex-1',
        className,
      )}
    >
      {category.image && (
        <Image
          src={category.image}
          alt=""
          fill
          sizes={alta ? '400px' : '(min-width: 640px) 50vw, 100vw'}
          className="object-cover"
        />
      )}
      {/* Velo negro al 50 % sobre toda la imagen, como el original. */}
      <div className="absolute inset-0 bg-black/50" />
      <span
        className={cn(
          'relative px-4 text-center font-bold text-white uppercase',
          alta ? 'text-[32px] sm:text-[40px]' : 'text-[36px] sm:text-[50px]',
        )}
      >
        {category.name}
      </span>
    </Link>
  );
}
