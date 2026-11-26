'use client';

/**
 * Búsqueda por foto gratuita: todo ocurre en el navegador del visitante.
 *
 * MobileNet (una red de reconocimiento de imágenes de Google, entrenada
 * con millones de fotos) convierte cada imagen en una «huella» de 1 280
 * números que resume lo que se ve en ella. Dos fotos de zapatos dan
 * huellas parecidas aunque los zapatos no sean iguales. Se calcula la
 * huella de la foto y la de cada producto, y se muestran los más
 * cercanos.
 *
 * Coste cero: ni servidor ni API de pago. A cambio, la primera vez el
 * navegador descarga TensorFlow.js (~370 kB, desde este mismo sitio) y el
 * modelo (~14 MB, desde TensorFlow Hub), y calcula las huellas del
 * catálogo; después todo queda en memoria durante la visita.
 *
 * Reconoce parecido visual, no intención: para «un regalo para alguien
 * que corre» hace falta el asistente con IA.
 */

interface Tensor {
  dataSync(): Float32Array;
  dispose(): void;
}
interface ModeloMobileNet {
  infer(imagen: HTMLImageElement | HTMLCanvasElement, embedding: boolean): Tensor;
}
interface GlobalesTensorFlow {
  tf?: { tidy<T>(fn: () => T): T };
  mobilenet?: { load(opciones: { version: 2; alpha: 1 }): Promise<ModeloMobileNet> };
}

export interface ProductoConImagen {
  slug: string;
  imagen: string | null;
}

/** Fracción del parecido del mejor resultado por debajo de la cual se descarta. */
const UMBRAL_RELATIVO = 0.7;
/** Siempre se muestran al menos estos, aunque queden bajo el umbral. */
const MINIMO_RESULTADOS = 3;

let modelo: Promise<ModeloMobileNet> | null = null;
const huellasCatalogo = new Map<string, Float32Array>();

function cargarScript(src: string): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolver();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => rechazar(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

function cargarModelo(): Promise<ModeloMobileNet> {
  modelo ??= (async () => {
    // En orden: MobileNet espera encontrar `tf` ya definido.
    await cargarScript('/vendor/tf.min.js');
    await cargarScript('/vendor/mobilenet.min.js');
    const globales = window as unknown as GlobalesTensorFlow;
    if (!globales.mobilenet) throw new Error('MobileNet no está disponible');
    return globales.mobilenet.load({ version: 2, alpha: 1 });
  })().catch((err) => {
    // Si falla (sin conexión, por ejemplo), el siguiente intento reintenta.
    modelo = null;
    throw err;
  });
  return modelo;
}

function huella(m: ModeloMobileNet, imagen: HTMLImageElement | HTMLCanvasElement): Float32Array {
  const tensor = m.infer(imagen, true);
  const datos = tensor.dataSync().slice();
  tensor.dispose();
  return datos;
}

function similitud(a: Float32Array, b: Float32Array): number {
  let producto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    producto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  return producto / (Math.sqrt(normaA) * Math.sqrt(normaB) || 1);
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error(src));
    img.src = src;
  });
}

/**
 * Productos más parecidos a la foto, del más al menos parecido.
 *
 * @param alAvanzar Recibe un texto de progreso; la primera búsqueda tarda
 *   unos segundos y quien espera debe saber por qué.
 */
export async function buscarPorFoto<T extends ProductoConImagen>(
  foto: HTMLCanvasElement,
  catalogo: T[],
  alAvanzar: (mensaje: string) => void,
  limite = 6,
): Promise<T[]> {
  alAvanzar('Preparando el reconocimiento de imágenes…');
  const m = await cargarModelo();

  const pendientes = catalogo.filter((p) => p.imagen && !huellasCatalogo.has(p.imagen));
  let hechos = 0;
  for (const producto of pendientes) {
    hechos += 1;
    if (hechos % 10 === 1) alAvanzar(`Analizando el catálogo (${hechos} de ${pendientes.length})…`);
    try {
      const img = await cargarImagen(producto.imagen!);
      huellasCatalogo.set(producto.imagen!, huella(m, img));
    } catch {
      // Una imagen que no carga solo deja fuera ese producto.
    }
  }

  alAvanzar('Comparando tu foto…');
  const buscada = huella(m, foto);

  const ordenados = catalogo
    .flatMap((producto) => {
      const h = producto.imagen ? huellasCatalogo.get(producto.imagen) : undefined;
      return h ? [{ producto, parecido: similitud(buscada, h) }] : [];
    })
    .sort((a, b) => b.parecido - a.parecido);

  // Solo lo que se parece de verdad: lo que queda muy por debajo del mejor
  // resultado es ruido (una hamaca para una foto de zapatos).
  const umbral = (ordenados[0]?.parecido ?? 0) * UMBRAL_RELATIVO;
  return ordenados
    .filter((r, i) => i < MINIMO_RESULTADOS || r.parecido >= umbral)
    .slice(0, limite)
    .map((r) => r.producto);
}
