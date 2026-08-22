'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { adminUpdateUserAction } from '@/actions/admin-user.actions';
import type { UserRole } from '@/generated/prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type AdminUpdateUserInput, adminUpdateUserSchema } from '@/lib/validations/admin-user';

interface UserFormDialogProps {
  trigger: React.ReactNode;
  user: { id: string; name: string; email: string; role: UserRole };
  canChangeRole: boolean;
  onSaved: () => void;
}

export function UserFormDialog({ trigger, user, canChangeRole, onSaved }: UserFormDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminUpdateUserInput>({
    resolver: zodResolver(adminUpdateUserSchema),
    defaultValues: { name: user.name, email: user.email, password: '', role: user.role },
  });

  useEffect(() => {
    if (open) reset({ name: user.name, email: user.email, password: '', role: user.role });
  }, [open, user, reset]);

  const onSubmit = async (values: AdminUpdateUserInput) => {
    const result = await adminUpdateUserAction(user.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Usuario actualizado.');
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña (opcional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Dejar en blanco para no cambiar"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>
          {canChangeRole && (
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={watch('role')}
                onValueChange={(v) => setValue('role', v as AdminUpdateUserInput['role'])}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuario</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
