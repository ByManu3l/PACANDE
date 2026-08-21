'use server';

import { AuthError } from 'next-auth';

import { signIn } from '@/lib/auth';
import { registerUser } from '@/lib/services/user.service';
import { runAction } from '@/lib/utils/action-result';
import { loginSchema, registerSchema } from '@/lib/validations/auth';

export async function loginAction(formData: FormData) {
  return runAction(async () => {
    const parsed = loginSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos.');
    }

    try {
      await signIn('credentials', { ...parsed.data, redirect: false });
    } catch (err) {
      if (err instanceof AuthError) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      throw err;
    }

    return { redirectTo: '/' };
  });
}

export async function registerAction(formData: FormData) {
  return runAction(async () => {
    const parsed = registerSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos.');
    }

    await registerUser(parsed.data);
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return { redirectTo: '/' };
  });
}
