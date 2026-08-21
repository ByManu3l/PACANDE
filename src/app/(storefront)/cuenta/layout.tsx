import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

// middleware.ts already redirects unauthenticated visits away from
// /cuenta/**; this is the same defense-in-depth check applied at the
// layout level (using redirect(), not the throwing requireSession() that
// Server Actions use) so a direct RSC render can never skip it either.
export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return children;
}
