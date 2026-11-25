'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { loginAction } from '@/actions/auth.actions';
import { BOTON_AUTH, CampoAuth } from '@/components/forms/campo-auth';
import { type LoginInput, loginSchema } from '@/lib/validations/auth';

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    const formData = new FormData();
    formData.set('email', values.email);
    formData.set('password', values.password);

    const result = await loginAction(formData);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <CampoAuth
        id="email"
        label="Correo Electrónico"
        icon={<Mail />}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <CampoAuth
        id="password"
        label="Contraseña"
        icon={<Lock />}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <button type="submit" disabled={isSubmitting} className={BOTON_AUTH}>
        {isSubmitting ? 'Ingresando…' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
