import type { Metadata } from 'next';

import { RegisterForm } from '@/components/forms/register-form';
import { VentanaCuenta } from '@/components/shared/ventana-cuenta';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegisterPage() {
  return (
    <VentanaCuenta
      titulo="Crear Cuenta"
      alternativa={{ pregunta: '¿Ya tienes cuenta?', texto: 'Inicia sesión aquí', href: '/login' }}
    >
      <RegisterForm />
    </VentanaCuenta>
  );
}
