#!/usr/bin/env node
/**
 * Comprueba que el repositorio esté completo como producto, no solo como
 * código que compila.
 *
 * Dos cosas: que existan los archivos que un comprador espera encontrar,
 * y que la documentación no tenga enlaces rotos. Lo segundo importa más
 * de lo que parece — un enlace muerto en el README es lo primero que ve
 * quien llega, y basta con renombrar un archivo para producirlo.
 *
 *   npm run audit:governance
 */

import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const RAIZ = process.cwd();

const VERDE = '\x1b[32m';
const ROJO = '\x1b[31m';
const AMARILLO = '\x1b[33m';
const GRIS = '\x1b[90m';
const RESET = '\x1b[0m';

async function existe(ruta) {
  try {
    await access(join(RAIZ, ruta));
    return true;
  } catch {
    return false;
  }
}

/**
 * Archivos que debe tener el repositorio, con el motivo.
 *
 * El motivo no es decorativo: si alguien borra uno, el mensaje explica
 * qué se pierde en vez de limitarse a decir que falta.
 */
const ARCHIVOS = [
  ['README.md', 'Es lo primero que se lee. Sin él nadie sabe qué es esto.'],
  ['LICENSE', 'Sin licencia, nadie sabe qué puede hacer con el código.'],
  ['CHANGELOG.md', 'Permite saber qué cambió entre dos versiones sin leer commits.'],
  ['SECURITY.md', 'Dice cómo reportar una vulnerabilidad sin publicarla.'],
  ['CONTRIBUTING.md', 'Describe el proceso antes de que alguien escriba código.'],
  ['CODE_OF_CONDUCT.md', 'Fija las reglas de convivencia por adelantado.'],
  ['.editorconfig', 'Evita que el formato dependa de quién escribe.'],
  ['.nvmrc', 'Fija la versión de Node; CI la lee de aquí.'],
  ['.gitattributes', 'Normaliza los finales de línea entre sistemas operativos.'],
  ['.env.example', 'Sin él, arrancar el proyecto es adivinar qué variables hacen falta.'],
  ['.env.test.example', 'Lo mismo, para poder ejecutar las pruebas.'],
  ['.github/CODEOWNERS', 'Asigna revisor automático a las rutas delicadas.'],
  ['.github/dependabot.yml', 'Mantiene las dependencias al día sin trabajo manual.'],
  ['.github/pull_request_template.md', 'Recuerda las comprobaciones del proyecto en cada PR.'],
  [
    '.github/ISSUE_TEMPLATE/fallo.yml',
    'Un fallo sin pasos para reproducirlo no se puede arreglar.',
  ],
  ['.github/workflows/ci.yml', 'Sin CI, «funciona en mi máquina» es toda la garantía.'],
  ['.husky/pre-commit', 'Formatea y pasa el linter antes de cada commit.'],
  ['docs/ARQUITECTURA.md', 'Punto de entrada para quien hereda el proyecto.'],
  ['docs/DECISIONES.md', 'Evita que se reabran debates ya cerrados.'],
  ['docs/PERSONALIZACION.md', 'Es lo que convierte la plantilla en una tienda.'],
  ['docs/CONTRIBUIR.md', 'Las reglas técnicas del proyecto.'],
  ['docs/AUDITORIA.md', 'El estado verificado: qué se corrigió y qué no.'],
];

const IGNORAR = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results']);

/** Todos los .md del repositorio, salvo los generados. */
async function documentos(dir = RAIZ, acumulado = []) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;

    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) await documentos(ruta, acumulado);
    else if (entrada.name.endsWith('.md')) acumulado.push(ruta);
  }
  return acumulado;
}

/**
 * Enlaces rotos en la documentación.
 *
 * Solo se comprueban los relativos: los externos exigirían red y harían
 * el script lento y dependiente de que un servicio ajeno esté en pie.
 * Las anclas (`#seccion`) tampoco se resuelven, porque verificarlas
 * obligaría a interpretar el Markdown entero.
 */
async function enlacesRotos() {
  const fallos = [];

  for (const archivo of await documentos()) {
    const texto = await readFile(archivo, 'utf8');
    const patron = /\[([^\]]*)\]\(([^)]+)\)/g;
    let m;

    while ((m = patron.exec(texto)) !== null) {
      const destino = m[2].split('#')[0].trim();

      if (!destino) continue;
      if (/^(https?:|mailto:)/.test(destino)) continue;

      const absoluto = resolve(dirname(archivo), destino);
      try {
        await access(absoluto);
      } catch {
        const desde = relative(RAIZ, archivo).split(sep).join('/');
        const numero = texto.slice(0, m.index).split('\n').length;
        fallos.push(`${desde}:${numero} — «${m[1]}» apunta a ${destino}`);
      }
    }
  }

  return fallos;
}

async function main() {
  console.log(`\n${GRIS}Auditoría de gobernanza del repositorio${RESET}\n`);

  const faltantes = [];
  for (const [ruta, porque] of ARCHIVOS) {
    if (!(await existe(ruta))) faltantes.push(`${ruta} — ${porque}`);
  }

  const presentes = ARCHIVOS.length - faltantes.length;

  if (faltantes.length === 0) {
    console.log(`  ${VERDE}✓${RESET} Están los ${ARCHIVOS.length} archivos esperados`);
  } else {
    console.log(`  ${ROJO}✗${RESET} Faltan ${faltantes.length} de ${ARCHIVOS.length} archivos`);
    for (const f of faltantes) console.log(`    ${GRIS}·${RESET} ${f}`);
    console.log('');
  }

  const rotos = await enlacesRotos();

  if (rotos.length === 0) {
    console.log(`  ${VERDE}✓${RESET} Ningún enlace roto en la documentación`);
  } else {
    console.log(`  ${ROJO}✗${RESET} ${rotos.length} enlace(s) roto(s) en la documentación`);
    console.log(
      `    ${AMARILLO}Un enlace muerto en el README es lo primero que ve quien llega.${RESET}`,
    );
    for (const r of rotos.slice(0, 15)) console.log(`    ${GRIS}·${RESET} ${r}`);
    if (rotos.length > 15) console.log(`    ${GRIS}· … y ${rotos.length - 15} más${RESET}`);
  }

  console.log('');

  if (faltantes.length === 0 && rotos.length === 0) {
    console.log(`${VERDE}Gobernanza completa: ${presentes} archivos, 0 enlaces rotos.${RESET}\n`);
    process.exit(0);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
