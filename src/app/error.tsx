'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Frontera de error de la aplicación. Next.js la renderiza cuando una
 * página o un layout lanza durante el render en servidor o cliente.
 *
 * Nunca muestra `error.message`: puede contener nombres de tabla, rutas de
 * archivo o fragmentos de consulta. El detalle se registra para el equipo
 * y al visitante se le da algo accionable — reintentar o volver al inicio.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción, aquí es donde se envía el error al servicio de
    // observabilidad (Sentry, Highlight, etc.). El `digest` es el
    // identificador que Next.js también escribe en los logs del servidor,
    // y permite cruzar lo que vio el usuario con la traza completa.
    // Aquí se usa `console.error` y no el `logger` del proyecto: esto es
    // un componente de cliente y el logger es de servidor (depende de
    // `env`, que valida variables que en el navegador no existen).
    //
    // El error del servidor ya quedó registrado allí; `digest` es la
    // referencia que permite cruzarlo con esta pantalla. Para capturar
    // además los errores del navegador, este es el punto donde enganchar
    // el SDK de navegador de Sentry o equivalente.
    console.error('Error en la frontera de error', { digest: error.digest, error });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-muted-foreground">
        No pudimos cargar esta página. Puedes reintentar; si el problema continúa, vuelve más tarde.
      </p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">Referencia: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
