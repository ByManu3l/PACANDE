import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Frontera de almacenamiento de archivos subidos por usuarios.
 *
 * Existe como interfaz porque el adaptador por defecto (disco local) **no
 * funciona en un despliegue serverless**: en Vercel y equivalentes el
 * sistema de archivos es efímero y se pierde entre peticiones. Cambiar a
 * Vercel Blob, S3 o R2 debe ser escribir una clase nueva aquí, sin tocar
 * ningún punto de llamada.
 */
export interface StorageAdapter {
  /** Guarda un archivo y devuelve su ruta pública (p. ej. `/uploads/avatars/abc.jpg`). */
  save(file: File, directory: string, filename: string): Promise<string>;
  /** Borra por ruta pública. Idempotente: no falla si el archivo ya no está. */
  delete(publicPath: string): Promise<void>;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Resuelve una ruta pública a una ruta de disco, garantizando que no se
 * escapa de `public/`.
 *
 * Sin esta comprobación, una ruta como `/../../.env` haría que `path.join`
 * devolviera un archivo fuera del directorio público: bastaría con guardar
 * esa cadena en `Product.images` para conseguir un borrado arbitrario de
 * archivos del servidor. Las rutas siempre las genera este módulo, pero un
 * adaptador no debe confiar en su entrada.
 */
function resolveWithinPublic(publicPath: string): string {
  const resolved = path.resolve(PUBLIC_DIR, publicPath.replace(/^\/+/, ''));
  const publicRoot = path.resolve(PUBLIC_DIR);

  if (resolved !== publicRoot && !resolved.startsWith(publicRoot + path.sep)) {
    throw new Error(`Ruta fuera del directorio público: ${publicPath}`);
  }
  return resolved;
}

/**
 * Adaptador por defecto: escribe en `public/uploads/`, que está en
 * `.gitignore`. Sirve para desarrollo y para hosting con disco persistente.
 * Ver la nota de despliegue del README antes de usarlo en producción.
 */
class LocalDiskAdapter implements StorageAdapter {
  async save(file: File, directory: string, filename: string): Promise<string> {
    // Se valida el destino igual que en delete(): `directory` y `filename`
    // hoy son constantes del propio código más un UUID, pero el adaptador
    // no debe asumirlo.
    const publicPath = `/${directory}/${filename}`;
    const destination = resolveWithinPublic(publicPath);

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await file.arrayBuffer()));

    return publicPath;
  }

  async delete(publicPath: string): Promise<void> {
    // El borrado es limpieza best-effort: si el archivo ya no existe, o la
    // ruta apunta fuera de public/, se registra y se sigue. Nunca debe
    // tumbar la operación de negocio que lo disparó.
    try {
      await unlink(resolveWithinPublic(publicPath));
    } catch (err) {
      const isMissingFile =
        typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT';
      if (!isMissingFile) {
        console.warn(`No se pudo borrar el archivo "${publicPath}":`, err);
      }
    }
  }
}

export const storage: StorageAdapter = new LocalDiskAdapter();

/** Rutas de archivos servidos desde `public/` que forman parte del
 * catálogo semilla versionado, no subidas de usuarios. Borrarlas dejaría
 * al seed apuntando a imágenes inexistentes. */
export function isUserUpload(publicPath: string): boolean {
  return publicPath.startsWith('/uploads/');
}
