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
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
