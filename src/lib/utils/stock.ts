/**
 * Reglas del «stock inteligente» del panel de administración.
 *
 * Funciones puras, sin base de datos, para poder probarlas solas: el
 * servicio (`stock.service.ts`) solo junta los números y las aplica.
 *
 * La idea es avisar antes de quedarse sin producto, no cuando ya es tarde:
 * un producto que se vende rápido necesita reponerse con más margen que uno
 * que casi no se mueve, aunque los dos tengan las mismas unidades.
 */

/** Días de ventas que se miran para calcular el ritmo de cada producto. */
export const DIAS_DE_VENTAS = 30;

/** Por debajo de estas unidades se avisa siempre, se venda o no. */
export const STOCK_MINIMO = 5;

/** Si al ritmo actual las unidades duran menos que esto, hay que reponer. */
export const DIAS_DE_COBERTURA_MINIMOS = 14;

/** Al reponer, se apunta a tener para este tiempo de ventas… */
const DIAS_A_CUBRIR_AL_REPONER = 30;
/** …y nunca menos de estas unidades en el estante. */
const STOCK_OBJETIVO_MINIMO = 15;

/** Una sección con menos productos disponibles que esto se ve vacía. */
export const PRODUCTOS_MINIMOS_POR_SECCION = 3;

export type NivelDeStock = 'agotado' | 'bajo' | 'ok';

export interface EvaluacionDeStock {
  nivel: NivelDeStock;
  /** Unidades vendidas por día en el periodo mirado. */
  ventaDiaria: number;
  /** Días que duran las unidades al ritmo actual; `null` si no se vende. */
  diasDeCobertura: number | null;
  /** Unidades que conviene pedir; 0 si no hace falta. */
  unidadesSugeridas: number;
}

export function evaluarStock(stock: number, vendidasEnElPeriodo: number): EvaluacionDeStock {
  const ventaDiaria = Math.max(0, vendidasEnElPeriodo) / DIAS_DE_VENTAS;
  const diasDeCobertura = ventaDiaria > 0 ? stock / ventaDiaria : null;

  const nivel: NivelDeStock =
    stock <= 0
      ? 'agotado'
      : stock <= STOCK_MINIMO ||
          (diasDeCobertura !== null && diasDeCobertura < DIAS_DE_COBERTURA_MINIMOS)
        ? 'bajo'
        : 'ok';

  const objetivo = Math.max(
    STOCK_OBJETIVO_MINIMO,
    Math.ceil(ventaDiaria * DIAS_A_CUBRIR_AL_REPONER),
  );
  const unidadesSugeridas = nivel === 'ok' ? 0 : Math.max(0, objetivo - Math.max(0, stock));

  return { nivel, ventaDiaria, diasDeCobertura, unidadesSugeridas };
}

/**
 * Orden de urgencia: primero lo agotado, luego lo que antes se acaba.
 * Lo que no se vende va al final de su grupo: puede esperar.
 */
export function compararUrgencia(a: EvaluacionDeStock, b: EvaluacionDeStock): number {
  const peso = (e: EvaluacionDeStock) => (e.nivel === 'agotado' ? 0 : e.nivel === 'bajo' ? 1 : 2);
  if (peso(a) !== peso(b)) return peso(a) - peso(b);
  return (a.diasDeCobertura ?? Infinity) - (b.diasDeCobertura ?? Infinity);
}
