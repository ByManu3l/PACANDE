import { redirect } from 'next/navigation';

import { listUsersAction } from '@/actions/admin-user.actions';
import { UsersTable } from '@/components/admin/users-table';
import { auth } from '@/lib/auth';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const users = await listUsersAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          {session.user.role === 'ADMIN'
            ? 'Como Admin, solo puedes editar o eliminar cuentas de Usuario.'
            : 'Como Superadmin, puedes gestionar cualquier cuenta (excepto la tuya) y cambiar roles.'}
        </p>
      </div>
      <UsersTable
        initialUsers={users}
        currentUserId={session.user.id}
        currentUserRole={session.user.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN'}
      />
    </div>
  );
}
