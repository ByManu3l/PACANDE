/**
 * Sustituto de `server-only` para las pruebas.
 *
 * El paquete real lanza al importarse —así es como impide que un módulo
 * de servidor acabe en el bundle del cliente— y Vitest resuelve esa
 * variante, haciendo fallar todo lo que importe `lib/env.ts`.
 *
 * Estas pruebas corren en Node y ejercitan justamente el código de
 * servidor, así que aquí la barrera no aplica. No se está eludiendo nada:
 * el build de Next.js sigue comprobándola, y de hecho ya detectó un
 * import indebido desde un componente de cliente (`app/error.tsx`).
 *
 * Se declara aquí, y no apuntando dentro de `node_modules`, porque el
 * paquete no publica su variante vacía como subruta importable.
 */
export {};
