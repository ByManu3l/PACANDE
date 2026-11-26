/**
 * Búsqueda por palabras sobre el catálogo, en el navegador y sin coste.
 *
 * Es lo que usa el buscador por voz cuando no hay clave de la API de
 * Claude. Quien dicta no escribe «camiseta negra» sino «quiero una
 * camiseta negra, por favor»: buscar la frase entera no encontraría nada.
 * Aquí se quitan las palabras de relleno, se ignoran tildes, mayúsculas y
 * plurales, y se puntúa cada producto por cuántas palabras de la petición
 * aparecen en su nombre o su categoría.
 *
 * No entiende intenciones («un regalo para un deportista»): para eso está
 * el asistente con IA. Pero acierta con lo que la gente suele decir en
 * voz alta: el tipo de producto, el color, la categoría.
 */

/** Palabras que no ayudan a encontrar un producto. */
const RELLENO = new Set(
  [
    'a',
    'al',
    'algo',
    'alguna',
    'alguno',
    'busca',
    'buscame',
    'busco',
    'buscar',
    'como',
    'con',
    'cual',
    'de',
    'del',
    'dame',
    'deseo',
    'el',
    'en',
    'encontrar',
    'es',
    'esta',
    'este',
    'hay',
    'la',
    'las',
    'lo',
    'los',
    'me',
    'mi',
    'muestrame',
    'necesito',
    'o',
    'para',
    'por',
    'favor',
    'porfa',
    'que',
    'quiero',
    'quisiera',
    'se',
    'si',
    'tienes',
    'tiene',
    'tienen',
    'un',
    'una',
    'unas',
    'unos',
    'y',
    'ver',
    'hola',
    'gracias',
    'comprar',
    'producto',
    'productos',
  ].map(normalizarPalabra),
);

export interface ProductoBuscable {
  slug: string;
  nombre: string;
  categoria?: string;
}

/** Minúsculas, sin tildes y sin plural: «Camisetas» y «camiseta» coinciden. */
export function normalizarPalabra(palabra: string): string {
  const base = palabra.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (base.length > 4 && base.endsWith('es')) return base.slice(0, -2);
  if (base.length > 3 && base.endsWith('s')) return base.slice(0, -1);
  return base;
}

/** Palabras útiles de una petición, ya normalizadas y sin repetir. */
export function palabrasClave(peticion: string): string[] {
  const palabras = peticion
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(normalizarPalabra)
    .filter((p) => p.length > 1 && !RELLENO.has(p));
  return [...new Set(palabras)];
}

/**
 * Productos que coinciden con la petición, del más al menos relevante.
 *
 * Una coincidencia en el nombre vale el doble que en la categoría: quien
 * dice «camiseta» quiere camisetas antes que cualquier cosa de «Ropa».
 * Solo se devuelven productos con al menos una coincidencia.
 */
export function buscarEnCatalogo<T extends ProductoBuscable>(
  catalogo: T[],
  peticion: string,
  limite = 6,
): T[] {
  const claves = palabrasClave(peticion);
  if (claves.length === 0) return [];

  const puntuados = catalogo.map((producto, indice) => {
    const nombre = palabrasClave(producto.nombre);
    const categoria = palabrasClave(producto.categoria ?? '');
    let puntos = 0;
    for (const clave of claves) {
      if (nombre.some((p) => p.startsWith(clave) || clave.startsWith(p))) puntos += 2;
      else if (categoria.some((p) => p.startsWith(clave) || clave.startsWith(p))) puntos += 1;
    }
    return { producto, puntos, indice };
  });

  return puntuados
    .filter((p) => p.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.indice - b.indice)
    .slice(0, limite)
    .map((p) => p.producto);
}
