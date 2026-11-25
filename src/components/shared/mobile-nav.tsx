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
            className="text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-red-500 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Categorías</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-4 pb-6">
          {categories.map((category) => (
            <div key={category.slug} className="py-1">
              <Link
                href={`/categoria/${category.slug}`}
                onClick={() => setOpen(false)}
                className="hover:bg-muted block rounded-md px-2 py-2 font-medium"
              >
                {category.name}
              </Link>

              {category.children.length > 0 && (
                <div className="mt-1 ml-3 flex flex-col border-l pl-3">
                  {category.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/categoria/${child.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5 text-sm"
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
