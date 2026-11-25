'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface NavCategory {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
}

/**
 * Menú lateral para pantallas pequeñas.
 *
 * En el Navbar, la navegación de categorías y el buscador están ocultos
 * por debajo del breakpoint `md`. Sin este componente el storefront queda
 * sin forma de explorar el catálogo en móvil — que es donde ocurre la
 * mayor parte del tráfico de un E-commerce.
 *
 * Es un Client Component porque el panel necesita estado abierto/cerrado;
 * las categorías llegan ya resueltas desde el Navbar (Server Component)
 * para no consultar la base de datos otra vez desde el cliente.
 */
export function MobileNav({ categories }: { categories: NavCategory[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-brand text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>
        }
      />
      {/* Panel negro con separadores rojos: la barra lateral de categorías
          de la versión original. */}
      <SheetContent
        side="left"
        className="w-72 overflow-y-auto border-r-0 bg-black text-white [--foreground:#fff] [--muted-foreground:rgba(255,255,255,0.8)]"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Categorías</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-4 pb-6">
          {categories.map((category) => (
            <div key={category.slug} className="py-1">
              <Link
                href={`/categoria/${category.slug}`}
                onClick={() => setOpen(false)}
                className="hover:text-brand block px-2 py-2 text-xl transition-colors duration-300"
              >
                {category.name}
              </Link>

              {category.children.length > 0 && (
                <div className="flex flex-col">
                  {category.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/categoria/${child.slug}`}
                      onClick={() => setOpen(false)}
                      className="hover:text-brand border-b border-[rgba(255,0,0,0.9)] px-2 py-2.5 text-center text-white transition-colors duration-300 last:border-b-0"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
