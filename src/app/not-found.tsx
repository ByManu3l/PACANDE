import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * 404 de la aplicación. La alcanzan tanto las URLs inexistentes como las
 * llamadas explícitas a `notFound()` — por ejemplo, un slug de producto o
 * categoría que ya no existe.
 *
 * Ofrece salidas en vez de dejar al visitante en un callejón: en una
 * tienda, un 404 sin enlaces es una venta perdida.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-primary text-5xl font-bold">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        Es posible que el enlace haya cambiado o que el producto ya no esté disponible.
      </p>
      <div className="flex gap-3">
        <Button render={<Link href="/" />} nativeButton={false}>
          Ir al inicio
        </Button>
        <Button variant="outline" render={<Link href="/buscar" />} nativeButton={false}>
          Buscar productos
        </Button>
      </div>
    </div>
  );
}
