import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { verifyCredentials } from '@/lib/services/user.service';

import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
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
