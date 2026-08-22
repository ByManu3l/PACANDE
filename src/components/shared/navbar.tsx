import { Search, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { MobileNav } from '@/components/shared/mobile-nav';
import { UserMenu } from '@/components/shared/user-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/auth';
import { getCurrentCart } from '@/lib/cart-session';
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
  const [session, categories, cart] = await Promise.all([
    auth(),
    listCategoriesForNav(),
    getCurrentCart(),
  ]);
  const itemCount = cart ? cartTotals(cart).itemCount : 0;

  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <MobileNav
          categories={categories.map((c) => ({
            slug: c.slug,
            name: c.name,
            children: c.children.map((child) => ({ slug: child.slug, name: child.name })),
          }))}
        />

        <Link href="/" className="text-primary text-lg font-bold whitespace-nowrap">
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categoria/${category.slug}`}
              className="hover:text-primary text-foreground/80 transition-colors"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        {/* Visible también en móvil: buscar es la vía principal de acceso
            al catálogo en pantallas pequeñas. */}
        <form action="/buscar" className="ml-auto flex max-w-xs flex-1 items-center">
          <Input name="q" placeholder="Buscar…" aria-label="Buscar productos" className="h-9" />
          <Button type="submit" size="icon" variant="ghost" className="ml-1" aria-label="Buscar">
            <Search className="size-4" />
          </Button>
        </form>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            render={<Link href="/carrito" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={itemCount > 0 ? `Carrito, ${itemCount} artículo(s)` : 'Carrito'}
          >
            <ShoppingCart className="size-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                {itemCount}
              </Badge>
            )}
          </Button>

          {session?.user ? (
            <UserMenu
              user={{
                name: session.user.name ?? session.user.email ?? 'Usuario',
                email: session.user.email ?? '',
                role: session.user.role,
              }}
            />
          ) : (
            <Button render={<Link href="/login" />} nativeButton={false} size="sm">
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
