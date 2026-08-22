/**
 * Convierte un nombre en un identificador apto para URLs.
 *
 * `"Ratón Gaming Pro"` → `"raton-gaming-pro"`.
 *
 * El paso de `normalize('NFD')` separa cada letra acentuada en letra +
 * tilde, y el reemplazo siguiente borra las tildes sueltas; así `ó` se
 * convierte en `o` en vez de desaparecer. Todo lo que no sea `a-z0-9`
 * pasa a ser un guion, y los guiones sobrantes de los extremos se
 * recortan.
 *
 * Cuidado: dos nombres distintos pueden producir el mismo slug
 * (`"Camiseta Roja"` y `"Camiseta  roja!"`). Los slugs son únicos en la
 * base de datos, así que ese caso termina en un error de duplicado que
 * el formulario muestra al administrador para que ajuste el nombre.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita las tildes ya separadas
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
