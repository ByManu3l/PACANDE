import { Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';

import { ContactForm } from '@/components/forms/contact-form';
import { siteConfig } from '@/lib/config/site.config';

export const metadata: Metadata = { title: 'Contacto' };

/**
 * Contacto, con la composición original: el formulario a la izquierda
 * sobre fondo gris claro y, a la derecha, el bloque de atención al
 * cliente con borde negro.
 */
export default function ContactPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-between gap-10 bg-[#f4f4f4] px-5 py-10 text-center md:flex-row md:px-10">
      <div className="flex w-full flex-col md:w-[40%]">
        <h1 className="text-primary mb-5 text-[2.23rem] lg:text-[2.625rem]">Contacto</h1>
        <p className="mb-10 max-w-[600px] text-left text-[#333]">
          Si tienes alguna pregunta, no dudes en comunicarte con nosotros llenando el siguiente
          formulario.
        </p>
        <ContactForm destino={siteConfig.contactEmail} />
      </div>

      <div className="w-full md:w-1/2">
        <h2 className="text-primary mb-5 text-[1.7rem] lg:text-[2rem]">
          Ubicación Atención al Cliente
        </h2>
        <div className="flex flex-col items-center gap-4 border-2 border-black bg-white px-6 py-12">
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="hover:text-primary flex items-center gap-3 text-lg text-[#333]"
          >
            <Mail aria-hidden="true" className="text-brand size-6" />
            {siteConfig.contactEmail}
          </a>
          <a
            href={`tel:${siteConfig.contactPhone}`}
            className="hover:text-primary flex items-center gap-3 text-lg text-[#333]"
          >
            <Phone aria-hidden="true" className="text-brand size-6" />
            {siteConfig.contactPhone}
          </a>
        </div>
      </div>
    </div>
  );
}
