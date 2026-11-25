import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata: Metadata = { title: 'Ayuda' };

const FAQ = [
  {
    question: '¿Cuáles son los tiempos de envío?',
    answer:
      'Los pedidos se despachan en 1-2 días hábiles y llegan en 3-7 días hábiles según tu ciudad.',
  },
  {
    question: '¿Cómo hago seguimiento a mi pedido?',
    answer: 'Desde "Mi cuenta → Mis pedidos" puedes ver el estado y la historia de cada envío.',
  },
  {
    question: '¿Puedo devolver un producto?',
    answer:
      'Sí, tienes 30 días desde la entrega para solicitar una devolución, siempre que el producto esté sin usar.',
  },
  {
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Tarjeta de crédito/débito y pago contra entrega, según disponibilidad en tu zona.',
  },
];

/**
 * Ayuda, con la página original: titular rojo, introducción y guía
 * rápida, y las preguntas en un acordeón de cabeceras negras que se
 * vuelven rojas al pasar el ratón.
 */
export default function HelpPage() {
  return (
    <div className="py-5 text-black sm:px-5 sm:py-10">
      <h1 className="text-primary mb-2.5 text-center text-[2.23rem] lg:text-[2.625rem]">Ayuda</h1>
      <h2 className="mb-5 text-center text-[1.5rem] text-black lg:text-[1.7rem]">
        Encuentra respuestas a las preguntas más comunes
      </h2>

      <div className="mx-auto max-w-[800px] space-y-4 text-[18px] leading-relaxed">
        <p>
          Bienvenido a nuestra página de Ayuda. Aquí podrás encontrar información sobre cómo usar la
          tienda y resolver las dudas más comunes. Si tienes alguna otra pregunta,{' '}
          <Link href="/contacto" className="text-primary font-semibold hover:underline">
            contáctanos
          </Link>
          .
        </p>
        <h3 className="text-[1.25rem] font-semibold">Guía rápida:</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>Compra fácilmente: agrega productos al carrito y sigue los pasos del pago.</li>
          <li>Consulta el estado de tus pedidos desde «Mi cuenta → Mis pedidos».</li>
          <li>Guarda tus direcciones para pagar más rápido la próxima vez.</li>
        </ul>
      </div>

      <Accordion className="mx-auto mt-8 max-w-[800px] gap-2.5">
        {FAQ.map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`} className="not-last:border-b-0">
            <AccordionTrigger className="hover:bg-brand-dark aria-expanded:bg-primary rounded-[5px] bg-black p-[15px] text-base text-white transition-colors duration-300 hover:no-underline **:data-[slot=accordion-trigger-icon]:text-white">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="mt-[5px] rounded-[5px] bg-[#f8f8f8] p-[15px] text-base">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
