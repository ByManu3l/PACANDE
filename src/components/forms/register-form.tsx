'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { registerAction } from '@/actions/auth.actions';
import { BOTON_AUTH, CampoAuth } from '@/components/forms/campo-auth';
import { type RegisterInput, registerSchema } from '@/lib/validations/auth';

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    const formData = new FormData();
    formData.set('name', values.name);
    formData.set('email', values.email);
    formData.set('password', values.password);

    const result = await registerAction(formData);
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
        id="name"
        label="Nombre Completo"
        icon={<User />}
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <button type="submit" disabled={isSubmitting} className={BOTON_AUTH}>
        {isSubmitting ? 'Creando cuenta…' : 'Registrarse'}
      </button>
    </form>
  );
}
