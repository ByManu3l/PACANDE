import Link from 'next/link';

import { siteConfig } from '@/lib/config/site.config';

const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X' },
] as const;

const LEGAL_LINKS = [
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Política de privacidad' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/ayuda', label: 'Ayuda' },
];

/**
 * Pie de página en tres columnas sobre fondo oscuro, a juego con la
 * cabecera.
 *
 * El año del aviso de copyright se calcula en cada render en vez de estar
 * escrito a mano: un pie que sigue diciendo 2024 en 2027 es la señal más
 * barata de que una tienda está abandonada.
 */
export function Footer() {
  const año = new Date().getFullYear();
  const redes = SOCIAL_LINKS.filter((s) => siteConfig.social[s.key]);

  return (
    <footer className="mt-16 bg-neutral-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-8">
        <section>
          <h2 className="mb-3 font-bold tracking-wide text-red-500 uppercase">Sobre nosotros</h2>
          <p className="text-sm leading-relaxed text-white/70">
            Somos una empresa comprometida con brindar la mejor experiencia de compra en línea.
          </p>
        </section>

        <nav aria-label="Enlaces útiles">
          <h2 className="mb-3 font-bold tracking-wide text-red-500 uppercase">Enlaces útiles</h2>
          <ul className="space-y-2 text-sm">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-white/70 transition-colors duration-300 hover:text-red-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {redes.length > 0 && (
          <section>
            <h2 className="mb-3 font-bold tracking-wide text-red-500 uppercase">Síguenos</h2>
            <ul className="flex gap-4 text-sm">
              {redes.map((s) => (
                <li key={s.key}>
                  <a
                    href={siteConfig.social[s.key]}
                    className="text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:text-red-500"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="border-t border-white/10 py-5 text-center text-sm text-white/50">
        © {año} {siteConfig.name}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
