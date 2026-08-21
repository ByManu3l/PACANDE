import Link from 'next/link';

import { siteConfig } from '@/lib/config/site.config';

const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X' },
] as const;

const LEGAL_LINKS = [
  { href: '/contacto', label: 'Contacto' },
  { href: '/ayuda', label: 'Ayuda' },
  { href: '/terminos', label: 'Términos' },
  { href: '/privacidad', label: 'Privacidad' },
];

export function Footer() {
  return (
    <footer className="bg-muted/40 mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="text-muted-foreground text-sm">{siteConfig.description}</p>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex gap-4 text-sm">
          {SOCIAL_LINKS.filter((s) => siteConfig.social[s.key]).map((s) => (
            <a key={s.key} href={siteConfig.social[s.key]} className="hover:text-primary">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
