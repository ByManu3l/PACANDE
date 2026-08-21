'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { adminDeleteUserAction, listUsersAction } from '@/actions/admin-user.actions';
import { UserFormDialog } from '@/components/admin/user-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    setUsers(await listUsersAction());
  };

  const handleDelete = async (id: string) => {
    const result = await adminDeleteUserAction(id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Usuario eliminado.');
    refresh();
  };

  // Mirrors user.service.ts::assertCanManageTarget — an Admin can only
  // touch plain USER accounts; a Superadmin can touch anyone but themself.
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
                        <Button variant="ghost" size="icon">
                          <Pencil className="size-4" />
                        </Button>
                      }
                      user={user}
                      canChangeRole={currentUserRole === 'SUPERADMIN'}
                      onSaved={refresh}
                    />
                    <AlertDialog
                      open={deletingId === user.id}
                      onOpenChange={(open) => setDeletingId(open ? user.id : null)}
                    >
                      <AlertDialogTrigger
                        render={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar a &quot;{user.name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Si el usuario tiene pedidos, no podrá
                            eliminarse.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
