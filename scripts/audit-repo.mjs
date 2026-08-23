#!/usr/bin/env node
/**
 * Comprueba las reglas del proyecto que ninguna herramienta estándar
 * verifica.
 *
 * ESLint valida sintaxis y TypeScript valida tipos, pero ni uno ni otro
 * saben que en este proyecto solo `lib/services/` puede tocar Prisma, ni
 * que toda Server Action de administración debe empezar comprobando el
 * rol. Esas reglas estaban escritas en la documentación y se comprobaban
 * a mano; aquí se ejecutan.
 *
 *   npm run audit:repo
 *
 * Sale con código 1 si alguna falla, así que sirve en CI y en un gancho
 * de git. La salida dice qué archivo y qué línea, no solo que algo va mal.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const RAIZ = process.cwd();

const VERDE = '\x1b[32m';
const ROJO = '\x1b[31m';
const AMARILLO = '\x1b[33m';
const GRIS = '\x1b[90m';
const RESET = '\x1b[0m';

/** Directorios que nunca se analizan. */
const IGNORAR = new Set(['node_modules', '.next', '.git', 'generated', 'coverage', 'test-results']);

/** Recorre un directorio devolviendo las rutas de archivo que interesan. */
async function* recorrer(dir, extensiones) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;

    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      yield* recorrer(ruta, extensiones);
    } else if (extensiones.some((ext) => entrada.name.endsWith(ext))) {
      yield ruta;
    }
  }
}

/** Archivos de una carpeta, con su contenido. */
async function leerArchivos(subdir, extensiones = ['.ts', '.tsx']) {
  const archivos = [];
  for await (const ruta of recorrer(join(RAIZ, subdir), extensiones)) {
    // Se normaliza a barras: en Windows `relative` devuelve
    // contrabarras y las comparaciones de ruta de abajo fallarían en
    // silencio, dando falsos positivos. Pasó exactamente eso.
    archivos.push({
      ruta: relative(RAIZ, ruta).split(sep).join('/'),
      texto: await readFile(ruta, 'utf8'),
    });
  }
  return archivos;
}

/**
 * Quita comentarios y cadenas antes de buscar patrones.
 *
 * Sin esto, un comentario que *explica* una regla se cuenta como una
 * infracción de esa regla — y este proyecto está lleno de comentarios que
 * mencionan `prisma.` justamente para explicar dónde no debe aparecer.
 */
function soloCodigo(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}

/** Número de línea de un índice de carácter. */
function linea(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

const comprobaciones = [];

function comprobacion(nombre, porque, fn) {
  comprobaciones.push({ nombre, porque, fn });
}

// ---------------------------------------------------------------------------

comprobacion(
  'Prisma solo se usa desde lib/services/',
  'Es la regla estructural del proyecto: lo que hace la lógica de negocio comprobable sin levantar HTTP.',
  async () => {
    const fallos = [];

    for (const { ruta, texto } of [
      ...(await leerArchivos('src/app')),
      ...(await leerArchivos('src/actions')),
      ...(await leerArchivos('src/components')),
    ]) {
      const codigo = soloCodigo(texto);
      const patron = /\bprisma\.[a-z]/g;
      let m;
      while ((m = patron.exec(codigo)) !== null) {
        fallos.push(`${ruta}:${linea(codigo, m.index)} — usa \`${m[0]}…\``);
      }
    }

    return fallos;
  },
);

comprobacion(
  'Toda Server Action de administración comprueba el rol',
  'Una Server Action es un endpoint HTTP invocable desde la consola del navegador; `proxy.ts` no la protege.',
  async () => {
    const fallos = [];

    for (const { ruta, texto } of await leerArchivos('src/actions')) {
      if (!texto.includes("'use server'")) continue;

      // Cada `export async function` de un archivo de acciones.
      const patron = /export async function (\w+)\s*\(/g;
      let m;
      while ((m = patron.exec(texto)) !== null) {
        const nombre = m[1];

        // El cuerpo, hasta la siguiente exportación o el final.
        const desde = m.index;
        const siguiente = texto.indexOf('\nexport ', desde + 1);
        const cuerpo = texto.slice(desde, siguiente === -1 ? undefined : siguiente);

        const esDeAdmin = /admin|Admin/.test(nombre) || /Coupon|Category|Product/.test(nombre);
        const comprueba = /requireRole|requireSession/.test(cuerpo);

        if (esDeAdmin && !comprueba) {
          fallos.push(`${ruta}:${linea(texto, desde)} — \`${nombre}\` no llama a requireRole()`);
        }
      }
    }

    return fallos;
  },
);

comprobacion(
  'La marca solo vive en site.config.ts',
  'Es lo que permite re-marcar la plantilla editando un archivo. Cualquier otra aparición sobrevive al cambio de marca.',
  async () => {
    const fallos = [];
    const marca = /pacand[eé]/i;

    for (const { ruta, texto } of [
      ...(await leerArchivos('src/app')),
      ...(await leerArchivos('src/components')),
      ...(await leerArchivos('src/lib')),
    ]) {
      if (ruta.includes('site.config')) continue;

      const codigo = soloCodigo(texto);
      const m = marca.exec(codigo);
      if (m) fallos.push(`${ruta}:${linea(codigo, m.index)} — menciona «${m[0]}»`);
    }

    return fallos;
  },
);

comprobacion(
  'Las variables de entorno se leen de lib/env.ts',
  'Ahí están validadas y tipadas; `process.env` directo devuelve `undefined` en silencio si el nombre está mal escrito.',
  async () => {
    const fallos = [];

    for (const { ruta, texto } of await leerArchivos('src')) {
      if (ruta.includes('lib/env.ts') || ruta.includes('generated')) continue;

      const codigo = soloCodigo(texto);
      const patron = /process\.env\.\w+/g;
      let m;
      while ((m = patron.exec(codigo)) !== null) {
        fallos.push(`${ruta}:${linea(codigo, m.index)} — usa \`${m[0]}\``);
      }
    }

    return fallos;
  },
);

comprobacion(
  'No quedan console.log ni console.error sueltos',
  'El registro pasa por `lib/logger.ts`, que filtra datos sensibles y emite JSON en producción.',
  async () => {
    const fallos = [];
    // `error.tsx` es cliente y no puede usar el logger de servidor; lleva
    // su propia explicación en el código.
    const EXCEPCIONES = ['src/app/error.tsx', 'src/lib/logger.ts'];

    for (const { ruta, texto } of await leerArchivos('src')) {
      if (EXCEPCIONES.some((e) => ruta.replace(/\\/g, '/').endsWith(e))) continue;
      if (ruta.includes('generated')) continue;

      const codigo = soloCodigo(texto);
      const patron = /console\.(log|error|warn|debug)\s*\(/g;
      let m;
      while ((m = patron.exec(codigo)) !== null) {
        fallos.push(`${ruta}:${linea(codigo, m.index)} — usa \`console.${m[1]}\``);
      }
    }

    return fallos;
  },
);

comprobacion(
  'No hay `any` explícito',
  'Un `any` anula la comprobación de tipos en todo lo que toca, y se propaga en silencio.',
  async () => {
    const fallos = [];

    for (const { ruta, texto } of await leerArchivos('src')) {
      if (ruta.includes('generated')) continue;

      const codigo = soloCodigo(texto);
      const patron = /:\s*any\b|<any>|as any\b/g;
      let m;
      while ((m = patron.exec(codigo)) !== null) {
        fallos.push(`${ruta}:${linea(codigo, m.index)} — \`${m[0].trim()}\``);
      }
    }

    return fallos;
  },
);

comprobacion(
  'Los importes monetarios no se calculan con Number en los servicios',
  'La aritmética de dinero va en `Decimal`. `cartTotals` es la única excepción, y es informativa.',
  async () => {
    const fallos = [];
    const EXCEPCIONES = ['cart.service.ts'];

    for (const { ruta, texto } of await leerArchivos('src/lib/services')) {
      if (EXCEPCIONES.some((e) => ruta.endsWith(e))) continue;

      const codigo = soloCodigo(texto);
      const patron = /Number\((\w*)(price|total|subtotal|amount|discount)/gi;
      let m;
      while ((m = patron.exec(codigo)) !== null) {
        fallos.push(`${ruta}:${linea(codigo, m.index)} — \`${m[0]}…\``);
      }
    }

    return fallos;
  },
);

// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n${GRIS}Auditoría de reglas del proyecto${RESET}\n`);

  let fallidas = 0;

  for (const { nombre, porque, fn } of comprobaciones) {
    const fallos = await fn();

    if (fallos.length === 0) {
      console.log(`  ${VERDE}✓${RESET} ${nombre}`);
      continue;
    }

    fallidas++;
    console.log(`  ${ROJO}✗${RESET} ${nombre}`);
    console.log(`    ${AMARILLO}${porque}${RESET}`);
    for (const fallo of fallos.slice(0, 10)) {
      console.log(`    ${GRIS}·${RESET} ${fallo}`);
    }
    if (fallos.length > 10) {
      console.log(`    ${GRIS}· … y ${fallos.length - 10} más${RESET}`);
    }
    console.log('');
  }

  const total = comprobaciones.length;
  console.log('');

  if (fallidas === 0) {
    console.log(`${VERDE}Las ${total} comprobaciones pasan.${RESET}\n`);
    process.exit(0);
  }

  console.log(`${ROJO}${fallidas} de ${total} comprobaciones fallan.${RESET}\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
