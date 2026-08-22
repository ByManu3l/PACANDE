'use client';

import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { adminDeleteUserAction, listUsersAction } from '@/actions/admin-user.actions';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { UserFormDialog } from '@/components/admin/user-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type UserRow = Awaited<ReturnType<typeof listUsersAction>>[number];

const ROLE_LABELS = { USER: 'Usuario', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' } as const;

interface UsersTableProps {
  initialUsers: UserRow[];
  currentUserId: string;
  currentUserRole: 'ADMIN' | 'SUPERADMIN';
}

export function UsersTable({ initialUsers, currentUserId, currentUserRole }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);

  const refresh = async () => {
    setUsers(await listUsersAction());
  };

  // Refleja `assertCanManageTarget` de user.service.ts: un ADMIN solo
  // gestiona cuentas USER, y un SUPERADMIN a cualquiera menos a sí mismo.
  //
  // Esto solo oculta botones; la regla que de verdad protege es la del
  // servicio. Duplicarla aquí evita ofrecer acciones que van a fallar.
  const canManage = (target: UserRow) => {
    if (target.id === currentUserId) return false;
    if (currentUserRole === 'ADMIN' && target.role !== 'USER') return false;
    return true;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Registrado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const manageable = canManage(user);
          return (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.name}
                {user.id === currentUserId && (
                  <Badge variant="secondary" className="ml-2">
                    Tú
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'USER' ? 'secondary' : 'default'}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(user.createdAt).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                {manageable ? (
                  <>
                    <UserFormDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Editar ${user.name}`}>
                          <Pencil className="size-4" />
                        </Button>
                      }
                      user={user}
                      canChangeRole={currentUserRole === 'SUPERADMIN'}
                      onSaved={refresh}
                    />
                    <DeleteConfirmDialog
                      itemName={user.name}
                      description="Esta acción no se puede deshacer. Un usuario con pedidos asociados no puede eliminarse: su historial de compras debe conservarse."
                      onConfirm={() => adminDeleteUserAction(user.id)}
                      onDeleted={refresh}
                      successMessage="Usuario eliminado."
                    />
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">Sin permisos</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
