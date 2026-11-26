#!/usr/bin/env node
/**
 * Copia TensorFlow.js y MobileNet a `public/vendor/` para la búsqueda por
 * foto gratuita.
 *
 * **Por qué no se importan como cualquier dependencia.** Pesan ~370 kB
 * comprimidos: metidos en el empaquetado, rompen el presupuesto de
 * `audit-bundle.mjs` y, peor, Next.js podría precargarlos. Servidos como
 * archivos estáticos aparte, solo los descarga quien pulsa «buscar con
 * una foto», y nunca el resto de visitantes.
 *
 * Se ejecuta en `postinstall`, así que en Vercel ocurre solo al instalar.
 * La carpeta de destino está en `.gitignore`: es un derivado de
 * `node_modules`, no código del proyecto.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = process.cwd();
const DESTINO = join(RAIZ, 'public', 'vendor');

const ARCHIVOS = [
  ['node_modules/@tensorflow/tfjs/dist/tf.min.js', 'tf.min.js'],
  ['node_modules/@tensorflow-models/mobilenet/dist/mobilenet.min.js', 'mobilenet.min.js'],
];

await mkdir(DESTINO, { recursive: true });
for (const [origen, nombre] of ARCHIVOS) {
  await copyFile(join(RAIZ, origen), join(DESTINO, nombre));
}
console.log(`Búsqueda por foto: ${ARCHIVOS.length} archivos copiados a public/vendor/.`);
