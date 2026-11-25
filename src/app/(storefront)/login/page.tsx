import type { Metadata } from 'next';

import { LoginForm } from '@/components/forms/login-form';
import { VentanaCuenta } from '@/components/shared/ventana-cuenta';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <VentanaCuenta
      titulo="Iniciar Sesión"
      alternativa={{ pregunta: '¿No tienes cuenta?', texto: 'Regístrate aquí', href: '/registro' }}
    >
      <LoginForm />
    </VentanaCuenta>
  );
}
