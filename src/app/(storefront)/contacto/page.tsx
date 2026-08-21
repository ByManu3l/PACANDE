import { Mail, Phone } from 'lucide-react';

import { siteConfig } from '@/lib/config/site.config';

export default function ContactPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacto</h1>
        <p className="text-muted-foreground mt-1">
          ¿Tienes una pregunta? Escríbenos directamente por estos medios.
        </p>
      </div>

      <div className="space-y-3">
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="hover:text-primary flex items-center gap-3"
        >
          <Mail className="size-5" />
          {siteConfig.contactEmail}
        </a>
        <a
          href={`tel:${siteConfig.contactPhone}`}
          className="hover:text-primary flex items-center gap-3"
        >
          <Phone className="size-5" />
          {siteConfig.contactPhone}
        </a>
      </div>
    </div>
  );
}
