import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { verifyCredentials } from '@/lib/services/user.service';

import { authConfig } from './auth.config';

/**
 * Instancia completa de Auth.js, con el proveedor de credenciales.
 *
 * **Por qué está separada de `auth.config.ts`:** `proxy.ts` corre en el
 * runtime Edge, donde no hay acceso a Prisma ni a bcrypt. Si el proxy
 * importara este archivo, arrastraría ambos y no compilaría. Por eso la
 * configuración que el proxy necesita (rutas, callbacks del token) vive
 * en `auth.config.ts`, sin dependencias de Node, y el proveedor —que sí
 * consulta la base de datos— se añade solo aquí, que únicamente se
 * importa desde el servidor.
 *
 * - `auth()` ....... lee la sesión actual en Server Components y Actions.
 * - `signIn`/`signOut` ... se llaman desde Server Actions.
 * - `handlers` ..... los expone `app/api/auth/[...nextauth]/route.ts`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      // Devolver null es la forma que tiene Auth.js de decir "credenciales
      // inválidas". `verifyCredentials` tarda lo mismo exista el correo o
      // no, para no revelar qué correos están registrados.
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') return null;

        const user = await verifyCredentials(email, password);
        return user;
      },
    }),
  ],
});
