'use server';

import { AuthError } from 'next-auth';

import { mergeGuestCartIntoSession } from '@/lib/cart-session';
import { signIn, signOut } from '@/lib/auth';
import { registerUser, verifyCredentials } from '@/lib/services/user.service';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { runAction } from '@/lib/utils/action-result';
import { loginSchema, registerSchema } from '@/lib/validations/auth';

/**
 * Acceso, registro y cierre de sesion.
 *
 * Las dos primeras hacen algo mas que autenticar: al iniciar sesion hay
 * que trasladar el carrito que el visitante llenaba de forma anonima a su
 * cuenta. Si no, el carrito parece vaciarse justo al entrar, que es el
 * momento en el que mas gente abandona la compra.
 */

export async function loginAction(formData: FormData) {
  return runAction(async () => {
    const credentials = loginSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    // Antes de verificar nada: sin esto, probar contraseñas en bucle sale
    // gratis. Se discrimina también por correo para que varias personas
    // tras la misma IP —una oficina, un cibercafé— no se bloqueen entre sí.
    await enforceRateLimit(RATE_LIMITS.login, 'login', credentials.email);

    // Se verifica aqui ademas de dentro del proveedor de credenciales
    // para tener el id del usuario por adelantado: dentro de esta misma
    // invocacion, `auth()` todavia no ve la cookie de sesion recien
    // creada, y ese id hace falta para fusionar el carrito mas abajo.
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

    // Se devuelve la ruta en vez de llamar a `redirect()`: dentro de
    // `runAction` un redirect se propaga como excepcion y el `catch` lo
    // convertiria en un mensaje de error. Quien navega es el cliente.
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

    await enforceRateLimit(RATE_LIMITS.register, 'register');

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
