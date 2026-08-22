// Componente de shadcn/ui, copiado al repositorio (no es una dependencia).
//
// Puedes editarlo libremente: es tuyo. Pero ten en cuenta que volver a
// ejecutar `npx shadcn add <nombre>` lo SOBRESCRIBE sin avisar. Si haces
// cambios que quieras conservar, anótalos aquí debajo.
//
// Esta plantilla usa la variante de shadcn construida sobre **Base UI**,
// no sobre Radix. La API difiere en puntos concretos:
//   - `render={<Componente />}` en lugar de `asChild`.
//   - `nativeButton={false}` cuando un botón envuelve un enlace.
//   - Accordion no recibe `type` ni `collapsible`.
// Copiar y pegar ejemplos de la documentación de Radix no funcionará.
import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
