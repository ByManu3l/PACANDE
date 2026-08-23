'use client';

import { LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import Link from 'next/link';

import { logoutAction } from '@/actions/auth.actions';
import type { UserRole } from '@/generated/prisma/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  user: { name: string; email: string; role: UserRole };
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
      {/* El disparador es solo un avatar con iniciales, así que necesita
          un nombre accesible explícito: sin él, un lector de pantalla
          anuncia «botón» y nada más, y no hay forma de saber que ahí está
          la cuenta. Las iniciales tampoco sirven como etiqueta —«MP» no
          significa nada leído en voz alta. */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={`Cuenta de ${user.name}`}
          />
        }
      >
        <Avatar className="size-8">
          <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* `DropdownMenuLabel` es, en Base UI, la etiqueta de un GRUPO
            (`Menu.GroupLabel`) y exige un `Menu.Group` alrededor. Sin él
            lanza «MenuGroupContext is missing» al abrir el menú y toda la
            página cae en la frontera de error.
            Esto estuvo roto desde que se escribió el componente y nadie lo
            vio: la prueba de extremo a extremo cerraba sesión con una
            petición directa al endpoint de Auth.js en vez de usar el
            menú, así que el fallo nunca se ejercitó. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm leading-none font-medium">{user.name}</p>
            <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
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
        {/* Un único elemento interactivo con `role="menuitem"`, que *es*
            el botón de envío del formulario de abajo.
            El atributo `form` permite que un botón envíe un formulario en
            el que no está anidado. Así se evitan las dos alternativas
            malas: un <button> dentro del menuitem (dos controles
            interactivos anidados, que las tecnologías de asistencia no
            saben presentar) y un <form> envolviendo al menuitem, que
            rompe la composición del menú de Base UI.
            Tiene que ser un formulario y no un `onClick` que invoque la
            acción: `signOut` responde con una redirección, y una llamada
            lanzada y olvidada no la procesa — la sesión se quedaba
            abierta. */}
        <DropdownMenuItem
          variant="destructive"
          render={<button type="submit" form="form-cerrar-sesion" />}
        >
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Fuera del menú a propósito: el menú se desmonta al cerrarse, y
          con él se iría el formulario antes de que llegue a enviarse. */}
      <form id="form-cerrar-sesion" action={logoutAction} className="hidden" />
    </DropdownMenu>
  );
}
