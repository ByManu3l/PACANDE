import type { Metadata } from 'next';
import Link from 'next/link';

import { PaginaLegal } from '@/components/shared/pagina-legal';

export const metadata: Metadata = { title: 'Términos y condiciones' };

export default function TermsPage() {
  return (
    <PaginaLegal
      titulo="Términos y Condiciones"
      aviso="Contenido de ejemplo — reemplázalo con los términos reales de tu negocio antes de operar en producción."
      secciones={[
        {
          titulo: '1. Aceptación de los términos',
          contenido:
            'Al usar este sitio aceptas estos términos y condiciones en su totalidad. Si no estás de acuerdo, no debes usar el sitio.',
        },
        {
          titulo: '2. Pedidos y pagos',
          contenido:
            'Los precios se muestran en la moneda indicada e incluyen los impuestos aplicables. Un pedido se confirma una vez se aprueba el pago.',
        },
        {
          titulo: '3. Envíos y devoluciones',
          contenido: (
            <>
              Consulta los tiempos de envío y la política de devoluciones en la sección de{' '}
              <Link href="/ayuda">Ayuda</Link>.
            </>
          ),
        },
        {
          titulo: '4. Propiedad intelectual',
          contenido:
            'Todo el contenido de este sitio —textos, gráficos, logotipos y software— es propiedad de la empresa o de sus proveedores, y está protegido por las leyes de propiedad intelectual.',
        },
        {
          titulo: '5. Modificaciones de los términos',
          contenido:
            'Nos reservamos el derecho de modificar estos términos en cualquier momento. Te recomendamos revisar esta página periódicamente para estar al tanto de los cambios.',
        },
        {
          titulo: '6. Contacto',
          contenido: (
            <>
              Si tienes preguntas sobre estos términos, escríbenos desde la página de{' '}
              <Link href="/contacto">contacto</Link>.
            </>
          ),
        },
      ]}
    />
  );
}
