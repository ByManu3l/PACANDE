import type { Metadata } from 'next';
import Link from 'next/link';

import { PaginaLegal } from '@/components/shared/pagina-legal';

export const metadata: Metadata = { title: 'Política de privacidad' };

export default function PrivacyPage() {
  return (
    <PaginaLegal
      titulo="Política de Privacidad"
      aviso="Contenido de ejemplo — reemplázalo con la política real de tu negocio antes de operar en producción."
      secciones={[
        {
          titulo: '1. Datos que recopilamos',
          contenido:
            'Nombre, correo y dirección de envío al registrarte o realizar un pedido. Nunca almacenamos tu contraseña en texto plano ni compartimos tus datos con terceros sin tu consentimiento.',
        },
        {
          titulo: '2. Uso de los datos',
          contenido:
            'Usamos tus datos únicamente para procesar pedidos, gestionar tu cuenta y contactarte.',
        },
        {
          titulo: '3. Protección de la información',
          contenido:
            'Tomamos medidas de seguridad adecuadas para proteger tu información personal contra accesos no autorizados, alteraciones o destrucción. Las contraseñas se guardan cifradas con bcrypt y nunca en texto plano.',
        },
        {
          titulo: '4. Tus derechos',
          contenido: (
            <>
              Puedes solicitar la actualización o eliminación de tus datos escribiendo a{' '}
              <Link href="/contacto">contacto</Link>.
            </>
          ),
        },
      ]}
    />
  );
}
