#!/usr/bin/env node
/**
 * Presupuesto de tamaño del JavaScript que se envía al navegador.
 *
 * **Por qué esto y no Lighthouse.** El plan de la re-auditoría preveía un
 * presupuesto de rendimiento con Lighthouse en CI. Se descartó: sus
 * métricas de tiempo dependen de la carga del runner, así que el mismo
 * commit pasa una vez y falla otra. Una comprobación que se pone en rojo
 * sin motivo enseña a ignorar el rojo, que es peor que no comprobar nada.
 *
 * El tamaño del paquete, en cambio, es **determinista**: el mismo código
 * da siempre el mismo número. Y es la causa que más veces está detrás de
 * una portada lenta — alguien importa una biblioteca pesada en un
 * componente de cliente y nadie lo nota hasta que un usuario se queja.
 *
 * La accesibilidad, que Lighthouse también habría cubierto, ya se verifica
 * con `axe` en `tests/e2e/accesibilidad.spec.ts`, y con más detalle.
 *
 *   npm run audit:bundle    (requiere `npm run build` antes)
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const RAIZ = process.cwd();
const CHUNKS = join(RAIZ, '.next', 'static', 'chunks');

const VERDE = '\x1b[32m';
const ROJO = '\x1b[31m';
const AMARILLO = '\x1b[33m';
const GRIS = '\x1b[90m';
const RESET = '\x1b[0m';

/**
 * Presupuestos, en kilobytes comprimidos con gzip.
 *
 * Se mide comprimido porque es lo que viaja por la red. Los valores
 * están un 20–25 % por encima del tamaño actual: suficiente margen para
 * que un cambio normal no dispare la alarma, y suficientemente ajustado
 * para que añadir una biblioteca pesada sí lo haga.
 *
 * Si un presupuesto se supera, la pregunta correcta no es «¿lo subo?»
 * sino «¿qué entró y hacía falta?».
 */
const PRESUPUESTOS = {
  /** Todo el JavaScript de cliente. Actual: ~514 kB. */
  total: 640,
  /** El fragmento individual más grande. Un pico aquí suele ser una
   *  biblioteca entera importada sin querer. */
  mayorFragmento: 100,
};

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

async function medir() {
  const archivos = [];

  async function recorrer(dir) {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name);
      if (entrada.isDirectory()) await recorrer(ruta);
      else if (entrada.name.endsWith('.js')) {
        const contenido = await readFile(ruta);
        archivos.push({
          nombre: entrada.name,
          bruto: (await stat(ruta)).size,
          gzip: gzipSync(contenido).length,
        });
      }
    }
  }

  await recorrer(CHUNKS);
  return archivos;
}

async function main() {
  console.log(`\n${GRIS}Presupuesto de tamaño del paquete${RESET}\n`);

  let archivos;
  try {
    archivos = await medir();
  } catch {
    console.log(
      `  ${AMARILLO}No hay build que medir. Ejecuta \`npm run build\` primero.${RESET}\n`,
    );
    process.exit(1);
  }

  const totalGzip = archivos.reduce((s, a) => s + a.gzip, 0);
  const mayor = archivos.reduce((a, b) => (a.gzip > b.gzip ? a : b));

  const comprobaciones = [
    {
      nombre: 'JavaScript de cliente, total',
      valor: kb(totalGzip),
      tope: PRESUPUESTOS.total,
    },
    {
      nombre: 'Fragmento individual más grande',
      valor: kb(mayor.gzip),
      tope: PRESUPUESTOS.mayorFragmento,
      detalle: mayor.nombre,
    },
  ];

  let fallidas = 0;

  for (const c of comprobaciones) {
    const porcentaje = Math.round((c.valor / c.tope) * 100);
    const dentro = c.valor <= c.tope;
    if (!dentro) fallidas++;

    const marca = dentro ? `${VERDE}✓${RESET}` : `${ROJO}✗${RESET}`;
    const detalle = c.detalle ? ` ${GRIS}(${c.detalle})${RESET}` : '';
    console.log(
      `  ${marca} ${c.nombre}: ${c.valor} kB de ${c.tope} kB ${GRIS}(${porcentaje} %)${RESET}${detalle}`,
    );
  }

  console.log(`\n  ${GRIS}${archivos.length} fragmentos, medidos comprimidos con gzip.${RESET}`);

  // Los cinco mayores, como pista de por dónde empezar si algo se dispara.
  const top = [...archivos].sort((a, b) => b.gzip - a.gzip).slice(0, 5);
  console.log(
    `  ${GRIS}Mayores: ${top.map((a) => `${a.nombre} ${kb(a.gzip)} kB`).join(', ')}${RESET}`,
  );

  console.log('');

  if (fallidas === 0) {
    console.log(`${VERDE}El paquete está dentro del presupuesto.${RESET}\n`);
    process.exit(0);
  }

  console.log(`${ROJO}${fallidas} presupuesto(s) superado(s).${RESET}`);
  console.log(`${AMARILLO}Antes de subir el tope: averigua qué entró y si hacía falta.${RESET}\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
