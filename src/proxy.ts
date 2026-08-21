import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth/auth.config';

// Route-level gate only (Edge runtime, can't reach Prisma). Every admin
// Server Action re-checks the role server-side too — see lib/auth/guards.ts
// — because a Server Action can be invoked directly, bypassing this file.
const { auth } = NextAuth(authConfig);

export { auth as proxy };

export const config = {
  matcher: ['/admin/:path*', '/cuenta/:path*'],
};
