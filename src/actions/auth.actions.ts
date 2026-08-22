'use server';

import { AuthError } from 'next-auth';

import { mergeGuestCartIntoSession } from '@/lib/cart-session';
import { signIn, signOut } from '@/lib/auth';
import { registerUser, verifyCredentials } from '@/lib/services/user.service';
import { runAction } from '@/lib/utils/action-result';
import { loginSchema, registerSchema } from '@/lib/validations/auth';

export async function loginAction(formData: FormData) {
  return runAction(async () => {
    const credentials = loginSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    // Verified once here (not just inside the Credentials provider) so we
    // have the user id up front — auth() can't be trusted to see the new
    // session cookie within this same Server Action invocation yet.
    const user = await verifyCredentials(credentials.email, credentials.password);
    if (!user) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    try {
      await signIn('credentials', { ...credentials, redirect: false });
    } catch (err) {
      if (err instanceof AuthError) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      throw err;
    }

    await mergeGuestCartIntoSession(user.id);

    return { redirectTo: '/' };
  });
}

export async function logoutAction() {
  await signOut({ redirectTo: '/' });
}

export async function registerAction(formData: FormData) {
  return runAction(async () => {
    const input = registerSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const user = await registerUser(input);
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      redirect: false,
    });
    await mergeGuestCartIntoSession(user.id);

    return { redirectTo: '/' };
  });
}
