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
'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
