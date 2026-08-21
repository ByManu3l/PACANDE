import Image from 'next/image';
import Link from 'next/link';

interface CategoryCardProps {
  category: { slug: string; name: string; image: string | null };
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="group border-border relative block aspect-4/3 overflow-hidden rounded-lg border"
    >
      {category.image ? (
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="bg-muted h-full w-full" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <span className="absolute right-0 bottom-0 left-0 p-3 font-semibold text-white">
        {category.name}
      </span>
    </Link>
  );
}
