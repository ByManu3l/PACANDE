'use client';

import { LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import Link from 'next/link';

import { logoutAction } from '@/actions/auth.actions';
import type { UserRole } from '@/generated/prisma/client';
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
  const nombreCorto = user.name.split(' ')[0];

  return (
    // `modal={false}`: un menú modal bloquea el desplazamiento y oculta la
    // barra de scroll; la ventana gana su ancho y los banners a todo el
    // ancho (100vw) cambian de tamaño mientras el menú está abierto.
    <DropdownMenu modal={false}>
      {/* Saludo en píldora con degradado rojo: el disparador de la
          cabecera original. Su texto visible es también su nombre
          accesible, así que quien usa control por voz puede decir
          «pulsa Hola, Ana» y funciona. */}
      <DropdownMenuTrigger className="focus-visible:ring-brand cursor-pointer rounded-[20px] bg-[linear-gradient(45deg,rgba(255,0,0,0.1),rgba(255,0,0,0.2))] px-4 py-1.5 text-[0.9rem] font-medium whitespace-nowrap text-white transition-all duration-300 outline-none hover:bg-[linear-gradient(45deg,rgba(255,0,0,0.2),rgba(255,0,0,0.3))] focus-visible:ring-2">
        Hola, {nombreCorto}
      </DropdownMenuTrigger>
      {/* Menú negro con borde rojo, como el original. Se redefinen las
          variables de color en el propio menú para que los elementos de
          shadcn hereden la paleta sin tocar cada uno. */}
      <DropdownMenuContent
        align="end"
        className="border-brand w-56 rounded-lg border bg-black/95 py-2 text-white ring-0 [--accent-foreground:#ff0000] [--accent:rgba(255,0,0,0.1)] [--border:rgba(255,0,0,0.3)] [--muted-foreground:rgba(255,255,255,0.7)] [--popover-foreground:#fff] [--popover:transparent]"
      >
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
        <DropdownMenuItem render={<button type="submit" form="form-cerrar-sesion" />}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Fuera del menú a propósito: el menú se desmonta al cerrarse, y
          con él se iría el formulario antes de que llegue a enviarse. */}
      <form id="form-cerrar-sesion" action={logoutAction} className="hidden" />
    </DropdownMenu>
  );
}
