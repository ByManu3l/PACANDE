'use client';

import { LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import Link from 'next/link';

import { logoutAction } from '@/actions/auth.actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  user: { name: string; email: string; role: 'USER' | 'ADMIN' | 'SUPERADMIN' };
}

export function UserMenu({ user }: UserMenuProps) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
        <Avatar className="size-8">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm leading-none font-medium">{user.name}</p>
          <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/cuenta" />}>
          <User /> Mi cuenta
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/cuenta/pedidos" />}>
          <Package /> Mis pedidos
        </DropdownMenuItem>
        {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboard /> Panel de administración
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <form action={logoutAction} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut /> Cerrar sesión
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
