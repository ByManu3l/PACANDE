import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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

export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Centro de ayuda</h1>
      <Accordion>
        {FAQ.map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
