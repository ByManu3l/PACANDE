// Componente de shadcn/ui, copiado al repositorio (no es una dependencia).
// MODIFICADO: estilo de la tienda (cabecera negra, esquinas de 15 px, sombra suave
// y resaltado rojo tenue al pasar sobre una fila).
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

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-[15px] bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08)]"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-black [&_tr]:border-b-0 [&_tr]:hover:bg-black', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-neutral-100 transition-colors hover:bg-[rgba(255,0,0,0.04)] has-aria-expanded:bg-[rgba(255,0,0,0.04)] data-[state=selected]:bg-[rgba(255,0,0,0.06)]',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-11 px-3 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap text-white uppercase [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-3 py-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
