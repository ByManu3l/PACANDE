import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind resolviendo los conflictos.
 *
 * `clsx` aplana condicionales (`cn('p-2', activo && 'p-4')`) y `twMerge`
 * descarta las clases que la siguiente sobreescribe, de modo que gane la
 * última: `cn('p-2', 'p-4')` devuelve `'p-4'` y no `'p-2 p-4'`, donde el
 * resultado dependería del orden en la hoja de estilos.
 *
 * Es la convención de shadcn/ui: la usan todos los componentes de
 * `components/ui/**` para admitir un `className` externo que pueda
 * sobreescribir sus estilos base.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
