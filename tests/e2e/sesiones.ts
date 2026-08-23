import path from 'node:path';

/**
 * Cuentas de ejemplo del seed y dónde se guarda la sesión de cada una.
 *
 * Ver `auth.setup.ts` para el porqué de reutilizar sesiones en vez de
 * entrar en cada prueba.
 */
export const USUARIOS = {
  user: { email: 'usuario@pacande.test', password: 'Usuario123!' },
  admin: { email: 'admin@pacande.test', password: 'Admin123!' },
  superadmin: { email: 'superadmin@pacande.test', password: 'Superadmin123!' },
} as const;

const DIRECTORIO = path.join(process.cwd(), 'tests', '.sesiones');

/** Archivos de sesión. Están en .gitignore: son credenciales efímeras. */
export const ESTADOS = {
  user: path.join(DIRECTORIO, 'user.json'),
  admin: path.join(DIRECTORIO, 'admin.json'),
  superadmin: path.join(DIRECTORIO, 'superadmin.json'),
} as const;
