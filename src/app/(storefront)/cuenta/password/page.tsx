import { ChangePasswordForm } from '@/components/forms/change-password-form';

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cambiar contraseña</h1>
      <ChangePasswordForm />
    </div>
  );
}
