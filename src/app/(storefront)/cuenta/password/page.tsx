import { ChangePasswordForm } from '@/components/forms/change-password-form';

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="before:bg-brand flex items-center gap-2.5 text-[1.3rem] font-semibold text-black before:block before:h-6 before:w-1 before:rounded">
        Cambiar contraseña
      </h1>
      <ChangePasswordForm />
    </div>
  );
}
