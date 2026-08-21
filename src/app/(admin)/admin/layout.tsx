import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

// Same defense-in-depth pattern as (storefront)/cuenta/layout.tsx: middleware
// already gates /admin/**, this catches direct RSC renders too.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
    redirect('/login');
  }

  return <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>;
}
