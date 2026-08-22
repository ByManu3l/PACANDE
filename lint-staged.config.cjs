/**
 * Qué se ejecuta sobre los archivos preparados antes de cada commit.
 *
 * Solo sobre lo que cambió, no sobre todo el proyecto: un gancho lento se
 * termina saltando con `--no-verify`, y un gancho que se salta no sirve.
 *
 * El typecheck NO está aquí a propósito. TypeScript necesita el proyecto
 * completo para comprobar tipos, así que no se puede limitar a los
 * archivos preparados; corre en CI y con `npm run typecheck`.
 */
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{js,cjs,mjs,json,css,md,yml,yaml}': ['prettier --write'],
  '*.prisma': ['prisma format'],
};
