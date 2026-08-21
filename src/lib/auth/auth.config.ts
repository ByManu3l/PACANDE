import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the Auth.js config: no bcrypt, no Prisma (both need
 * the Node runtime). middleware.ts imports only this file. The Credentials
 * provider itself — which does need Node — is added in ./index.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;

      if (pathname.startsWith('/admin')) {
        return isLoggedIn && (role === 'ADMIN' || role === 'SUPERADMIN');
      }
      if (pathname.startsWith('/cuenta')) {
        return isLoggedIn;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'USER' | 'ADMIN' | 'SUPERADMIN';
      }
      return session;
    },
  },
  providers: [], // Credentials provider is registered in ./index.ts (Node-only).
} satisfies NextAuthConfig;
