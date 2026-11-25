import Link from 'next/link';

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/shared/social-icons';
import { siteConfig } from '@/lib/config/site.config';

const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'x', label: 'X (Twitter)', Icon: XIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon },
] as const;

const LEGAL_LINKS = [
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Política de privacidad' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/ayuda', label: 'Ayuda' },
];

/**
 * Pie de página de la versión original: negro puro, tres columnas
 * centradas con el título en rojo, enlaces blancos que se vuelven rojos al
 * pasar el ratón y los iconos de redes en fila.
 *
 * El año del aviso de copyright se calcula en cada render en vez de estar
 * escrito a mano: un pie que sigue diciendo 2024 en 2027 es la señal más
 * barata de que una tienda está abandonada.
 */
export function Footer() {
  const año = new Date().getFullYear();
  const redes = SOCIAL_LINKS.filter((s) => siteConfig.social[s.key]);

  return (
    <footer className="relative z-[5] flex w-full flex-col items-center bg-black px-5 py-10 text-center text-white">
      <div className="flex w-full max-w-[1200px] flex-col items-center md:flex-row md:items-start md:justify-around">
        <section className="mb-5 flex basis-1/3 flex-col items-center md:mb-0">
          <h2 className="text-brand mb-2.5 text-xl">Sobre Nosotros</h2>
          <p className="max-w-sm">
            Somos una empresa comprometida con brindar la mejor experiencia de compra en línea.
          </p>
        </section>

        <nav
          aria-label="Enlaces útiles"
          className="mb-5 flex basis-1/3 flex-col items-center md:mb-0"
        >
          <h2 className="text-brand mb-2.5 text-xl">Enlaces útiles</h2>
          <ul>
            {LEGAL_LINKS.map((link) => (
              <li key={link.href} className="my-[5px]">
                <Link
                  href={link.href}
                  className="hover:text-brand text-white transition-colors duration-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {redes.length > 0 && (
          <section className="mb-5 flex basis-1/3 flex-col items-center md:mb-0">
            <h2 className="text-brand mb-2.5 text-xl">Síguenos</h2>
            <ul className="mt-2.5 flex items-center">
              {redes.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={siteConfig.social[key]}
                    aria-label={label}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="hover:text-brand mx-2.5 block text-white transition-colors duration-300"
                  >
                    <Icon className="size-6" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="mt-5">
        © {año} {siteConfig.name}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
