import { Boxes, Search, ShoppingCart, Truck, User, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { CurrencySelect } from '@/components/shared/currency-select';
import { MobileNav } from '@/components/shared/mobile-nav';
import { UserMenu } from '@/components/shared/user-menu';
import { auth } from '@/lib/auth';
import { getCurrentCart } from '@/lib/cart-session';
import { getMonedaDeVista } from '@/lib/currency-session';
import { siteConfig } from '@/lib/config/site.config';
import { cartTotals } from '@/lib/services/cart.service';
import { listCategoriesForNav } from '@/lib/services/category.service';

/**
 * Cabecera del storefront, fiel a la de la versión original: fondo negro
 * al 95 %, sombra roja tenue, logotipo con la inicial en rojo, buscador en
 * píldora con borde rojo y la fila de categorías centrada con el subrayado
 * que crece desde el centro.
 *
 * Server Component: resuelve sesión, categorías y carrito en el servidor y
 * entrega a los hijos solo lo que necesitan.
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
  const rol = session?.user?.role;
  const esEquipo = rol === 'ADMIN' || rol === 'SUPERADMIN';

  return (
    <header className="sticky top-0 z-40 bg-black/95 text-white shadow-[0_2px_15px_rgba(255,0,0,0.1)]">
      <div className="mx-auto max-w-[1400px] px-4 py-[0.3rem] sm:px-8">
        {/* Fila superior: identidad, buscador y accesos de cuenta. */}
        <div className="flex items-center justify-between gap-2 border-b border-[rgba(255,0,0,0.1)] py-[0.3rem] sm:gap-4">
          <MobileNav
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              children: c.children.map((child) => ({ slug: child.slug, name: child.name })),
            }))}
          />

          <Link
            href="/"
            className="group/marca flex shrink-0 items-center gap-2.5 whitespace-nowrap"
          >
            <Image
              src="/images/brand/logopaca.png"
              alt=""
              width={47}
              height={35}
              className="h-[35px] w-auto object-contain transition-transform duration-300 group-hover/marca:scale-105"
              priority
            />
            {/* En móvil solo queda el isotipo: el buscador necesita el ancho. */}
            <span className="hidden text-[22px] font-bold tracking-[1px] sm:inline">
              <span className="text-brand text-[28px]">{siteConfig.name.charAt(0)}</span>
              {siteConfig.name.slice(1)}
            </span>
          </Link>

          {/* Visible también en móvil: buscar es la vía principal de acceso
              al catálogo en pantallas pequeñas. Sin botón de enviar, como
              en el original: Intro envía el formulario de forma nativa. */}
          <form
            action="/buscar"
            role="search"
            className="relative flex max-w-[500px] min-w-0 flex-1 items-center sm:mx-8"
          >
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 size-[1.1rem] text-white/60"
            />
            <input
              name="q"
              type="search"
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="focus:border-brand w-full rounded-[20px] border-2 border-[rgba(255,0,0,0.3)] bg-white/10 py-2 pr-4 pl-10 text-[0.9rem] text-white transition-all duration-300 outline-none placeholder:text-white/60 focus:bg-white/15"
            />
          </form>

          <div className="flex items-center gap-1 sm:gap-4">
            {/* Accesos del equipo en píldoras, como en la cabecera
                original. Solo los ve quien tiene el rol. */}
            {esEquipo && (
              <div className="hidden gap-3 xl:flex">
                {rol === 'SUPERADMIN' && (
                  <AdminPill href="/admin/usuarios" label="Usuarios">
                    <UsersRound />
                  </AdminPill>
                )}
                <AdminPill href="/admin/productos" label="Productos">
                  <Boxes />
                </AdminPill>
                <AdminPill href="/admin/pedidos" label="Envíos">
                  <Truck />
                </AdminPill>
              </div>
            )}

            {siteConfig.displayCurrencies.length > 0 && (
              <div className="hidden sm:block">
                <CurrencySelect
                  monedaActual={monedaDeVista}
                  monedas={[siteConfig.defaultCurrency, ...siteConfig.displayCurrencies]}
                />
              </div>
            )}

            {session?.user ? (
              <UserMenu
                user={{
                  name: session.user.name ?? session.user.email ?? 'Usuario',
                  email: session.user.email ?? '',
                  role: session.user.role,
                }}
              />
            ) : (
              <Link href="/login" aria-label="Iniciar sesión" className={ICON_LINK}>
                <User className="size-6 fill-current" />
              </Link>
            )}

            <Link
              href="/carrito"
              className={`relative ${ICON_LINK}`}
              aria-label={itemCount > 0 ? `Carrito, ${itemCount} artículo(s)` : 'Carrito'}
            >
              <ShoppingCart className="size-6" />
              {itemCount > 0 && (
                <span className="bg-brand absolute -top-0.5 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Fila inferior: categorías de primer nivel, centradas. */}
        <nav aria-label="Categorías" className="hidden items-center justify-center py-2 md:flex">
          {categories.map((category) => (
            <Link key={category.slug} href={`/categoria/${category.slug}`} className={NAV_LINK}>
              {category.name}
            </Link>
          ))}

          {/* Ofertas cierra la fila, como en la cabecera original. */}
          <Link href="/ofertas" className={NAV_LINK}>
            Ofertas
          </Link>
        </nav>
      </div>
    </header>
  );
}

// El pseudoelemento crece desde el centro (0 → 80 % de ancho) en 300 ms:
// es el subrayado de la cabecera original.
const NAV_LINK =
  'relative px-6 py-[0.3rem] text-base text-white transition-all duration-300 after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-brand after:transition-all after:duration-300 hover:text-brand hover:after:left-[10%] hover:after:w-[80%] focus-visible:text-brand focus-visible:outline-none focus-visible:after:left-[10%] focus-visible:after:w-[80%]';

const ICON_LINK =
  'grid place-items-center p-2 text-white transition-all duration-300 hover:-translate-y-0.5 hover:text-brand focus-visible:text-brand focus-visible:outline-none';

function AdminPill({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-[15px] border border-[rgba(255,0,0,0.3)] bg-[rgba(255,0,0,0.1)] px-3 py-1.5 text-[0.9rem] whitespace-nowrap text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(255,0,0,0.2)] [&_svg]:size-4"
    >
      {children}
      {label}
    </Link>
  );
}
