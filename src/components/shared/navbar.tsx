import { Search, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { CurrencySelect } from '@/components/shared/currency-select';
import { MobileNav } from '@/components/shared/mobile-nav';
import { UserMenu } from '@/components/shared/user-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/auth';
import { getCurrentCart } from '@/lib/cart-session';
import { getMonedaDeVista } from '@/lib/currency-session';
import { siteConfig } from '@/lib/config/site.config';
import { cartTotals } from '@/lib/services/cart.service';
import { listCategoriesForNav } from '@/lib/services/category.service';

/**
 * Cabecera del storefront. Server Component: resuelve sesión, categorías y
 * carrito en el servidor y entrega a los hijos solo lo que necesitan.
 *
 * El buscador es un `<form action="/buscar">` sin JavaScript a propósito:
 * funciona con la navegación nativa del navegador y no necesita hidratar
 * nada para cumplir su función.
 */
export async function Navbar() {
  const [session, categories, cart, monedaDeVista] = await Promise.all([
    auth(),
    listCategoriesForNav(),
    getCurrentCart(),
    getMonedaDeVista(),
  ]);
  const itemCount = cart ? cartTotals(cart).itemCount : 0;

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 text-white shadow-[0_2px_15px_rgba(220,38,38,0.15)] backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        {/* Fila superior: identidad, buscador y accesos de cuenta. */}
        <div className="flex h-14 items-center gap-2 border-b border-red-500/15 sm:gap-4">
          <MobileNav
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              children: c.children.map((child) => ({ slug: child.slug, name: child.name })),
            }))}
          />

          <Link href="/" className="group/marca flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Image
              src="/images/brand/logopaca.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain transition-transform duration-300 group-hover/marca:scale-105"
              priority
            />
            {/* En móvil solo queda el isotipo: el buscador necesita el ancho. */}
            <span className="hidden text-xl font-bold tracking-tight sm:inline">
              <span className="text-primary">{siteConfig.name.charAt(0)}</span>
              {siteConfig.name.slice(1)}
            </span>
          </Link>

          {/* Visible también en móvil: buscar es la vía principal de acceso
              al catálogo en pantallas pequeñas. */}
          <form
            action="/buscar"
            className="relative mx-auto flex w-full max-w-xl min-w-0 items-center"
          >
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 size-4 text-white/50"
            />
            <Input
              name="q"
              placeholder="Buscar productos…"
              aria-label="Buscar productos"
              className="h-9 rounded-full border-2 border-red-500/30 bg-white/10 pl-9 text-white transition-all duration-300 placeholder:text-white/60 focus-visible:border-red-600 focus-visible:bg-white/15"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="ml-1 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-red-500"
              aria-label="Buscar"
            >
              <Search className="size-4" />
            </Button>
          </form>

          <div className="flex items-center gap-1 sm:gap-2">
            {siteConfig.displayCurrencies.length > 0 && (
              <div className="hidden sm:block">
                <CurrencySelect
                  monedaActual={monedaDeVista}
                  monedas={[siteConfig.defaultCurrency, ...siteConfig.displayCurrencies]}
                />
              </div>
            )}

            <ButtonLink
              href="/carrito"
              variant="ghost"
              size="icon"
              className="relative text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-red-500"
              aria-label={itemCount > 0 ? `Carrito, ${itemCount} artículo(s)` : 'Carrito'}
            >
              <ShoppingCart className="size-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                  {itemCount}
                </Badge>
              )}
            </ButtonLink>

            {session?.user ? (
              <UserMenu
                user={{
                  name: session.user.name ?? session.user.email ?? 'Usuario',
                  email: session.user.email ?? '',
                  role: session.user.role,
                }}
              />
            ) : (
              <ButtonLink href="/login" size="sm">
                Entrar
              </ButtonLink>
            )}
          </div>
        </div>

        {/* Fila inferior: categorías de primer nivel, centradas. */}
        <nav className="hidden items-center justify-center gap-4 py-2 text-sm font-medium tracking-wide md:flex">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categoria/${category.slug}`}
              // El pseudoelemento crece desde el centro (0 → 80% de ancho)
              // en 300 ms: es el subrayado de la cabecera original.
              className="relative px-6 py-1 text-white/90 transition-colors duration-300 after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-red-600 after:transition-all after:duration-300 hover:text-red-500 hover:after:left-[10%] hover:after:w-[80%] focus-visible:text-red-500 focus-visible:outline-none focus-visible:after:left-[10%] focus-visible:after:w-[80%]"
            >
              {category.name}
            </Link>
          ))}

          {/* Ofertas cierra la fila, como en la cabecera original. En rojo
              permanente: es la entrada que se quiere que destaque. */}
          <Link
            href="/ofertas"
            className="relative px-6 py-1 font-semibold text-red-500 transition-colors duration-300 after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-red-600 after:transition-all after:duration-300 hover:text-red-400 hover:after:left-[10%] hover:after:w-[80%] focus-visible:text-red-400 focus-visible:outline-none focus-visible:after:left-[10%] focus-visible:after:w-[80%]"
          >
            Ofertas
          </Link>
        </nav>
      </div>
    </header>
  );
}
