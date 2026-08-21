import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Adapter boundary so swapping storage backends (e.g. for a serverless
 * deploy where the local filesystem doesn't persist between requests)
 * only means writing a new class here, not touching call sites.
 */
export interface StorageAdapter {
  /** Saves a file under public/<directory>/<filename> and returns its
   * public URL path (e.g. "/uploads/avatars/abc123.jpg"). */
  save(file: File, directory: string, filename: string): Promise<string>;
  delete(publicPath: string): Promise<void>;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Default adapter for local dev and traditional (non-serverless) hosting.
// public/uploads is gitignored — on Vercel/serverless the filesystem is
// ephemeral, so a real deployment should swap this for a
// VercelBlobAdapter (or S3/R2/etc) implementing the same interface.
class LocalDiskAdapter implements StorageAdapter {
  async save(file: File, directory: string, filename: string): Promise<string> {
    const dir = path.join(PUBLIC_DIR, directory);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return `/${directory}/${filename}`;
  }

  async delete(publicPath: string): Promise<void> {
    const filePath = path.join(PUBLIC_DIR, publicPath.replace(/^\//, ''));
    await unlink(filePath).catch(() => {
      // Fine if it was already gone — deletion is best-effort cleanup.
    });
  }
}

export const storage: StorageAdapter = new LocalDiskAdapter();
