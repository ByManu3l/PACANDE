import 'server-only';

import { siteConfig } from '@/lib/config/site.config';
import { logger } from '@/lib/logger';

/**
 * Tasas de cambio para **mostrar** precios en otra moneda.
 *
 * ## Por qué esto no cobra
 *
 * La conversión que produce este módulo es orientativa y nunca toca un
 * importe que se cobre. Todo pedido se calcula, se cobra y se guarda en
 * `siteConfig.defaultCurrency`. La razón no es técnica sino legal y
 * financiera:
 *
 * - **Publicidad engañosa.** Si se cobrara en la moneda mostrada, el
 *   importe real dependería de una tasa de un tercero en el instante del
 *   pago. Entre que alguien ve `USD 25` y pulsa pagar, la tasa puede
 *   moverse: se le cobra otra cifra que la anunciada.
 * - **Sin contrato no hay garantía.** Esta fuente es pública y gratuita:
 *   no tiene acuerdo de nivel de servicio, ni compromiso de exactitud, ni
 *   responsabilidad si devuelve un número erróneo. Una tasa mala aplicada
 *   al cobro son ventas por debajo de coste, en silencio y a escala.
 * - **La conversión real la hace quien cobra.** Las pasarelas liquidan
 *   con sus propias tasas contractuales. Duplicar ese cálculo aquí
 *   garantiza descuadres contables.
 *
 * Por eso la interfaz muestra siempre el importe de cobro junto al
 * convertido, y este último va marcado con «≈».
 *
 * ## Cómo falla
 *
 * Nunca hacia arriba. Si la petición falla, tarda o devuelve algo que no
 * se entiende, se usan las tasas de respaldo y la tienda sigue vendiendo.
 * Una tienda que no carga porque un servicio ajeno está caído es un fallo
 * mucho más caro que un precio de referencia desactualizado.
 */

/**
 * Respaldo usado cuando la fuente remota no responde.
 *
 * Son unidades de moneda extranjera por 1 COP, deliberadamente
 * conservadoras. Al ser aproximadas y estar etiquetadas como tales,
 * quedarse desactualizadas no engaña a nadie: el importe que se cobra
 * aparece al lado, sin convertir.
 */
const TASAS_DE_RESPALDO: Record<string, number> = {
  USD: 0.00024,
  EUR: 0.00022,
  MXN: 0.0044,
};

const FUENTE = 'https://api.exchangerate-api.com/v4/latest';
const TIEMPO_MAXIMO_MS = 2500;

export interface TasasDeCambio {
  /** Unidades de moneda destino por 1 unidad de la moneda base. */
  tasas: Record<string, number>;
  /** `false` cuando se están usando las tasas de respaldo. */
  enVivo: boolean;
}

/**
 * Tasas desde la moneda base a las de `displayCurrencies`.
 *
 * Se cachea una hora con la caché de datos de Next: las tasas de divisas
 * no se mueven lo suficiente en una hora como para justificar una
 * petición por visita, y así un pico de tráfico no dispara un pico de
 * llamadas a un tercero.
 */
export async function getExchangeRates(): Promise<TasasDeCambio> {
  const monedas = siteConfig.displayCurrencies;
  if (monedas.length === 0) return { tasas: {}, enVivo: false };

  const respaldo = Object.fromEntries(
    monedas.map((m) => [m, TASAS_DE_RESPALDO[m]]).filter(([, v]) => typeof v === 'number'),
  ) as Record<string, number>;

  try {
    const respuesta = await fetch(`${FUENTE}/${siteConfig.defaultCurrency}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });

    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

    const datos: unknown = await respuesta.json();
    const tasasRemotas =
      typeof datos === 'object' && datos !== null && 'rates' in datos
        ? (datos as { rates: unknown }).rates
        : null;

    if (typeof tasasRemotas !== 'object' || tasasRemotas === null) {
      throw new Error('respuesta sin campo `rates`');
    }

    const tasas: Record<string, number> = {};
    for (const moneda of monedas) {
      const valor = (tasasRemotas as Record<string, unknown>)[moneda];
      // Se valida moneda a moneda: una tasa ausente, cero o negativa
      // produciría precios absurdos, y es mejor caer al respaldo de esa
      // moneda concreta que mostrar «≈ $0».
      if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
        tasas[moneda] = valor;
      } else if (respaldo[moneda] !== undefined) {
        tasas[moneda] = respaldo[moneda];
      }
    }

    return { tasas, enVivo: true };
  } catch (error) {
    logger.warn('No se pudieron obtener las tasas de cambio; se usan las de respaldo.', {
      motivo: error instanceof Error ? error.message : String(error),
    });
    return { tasas: respaldo, enVivo: false };
  }
}

/**
 * Convierte un importe de la moneda base a otra.
 *
 * Devuelve `null` cuando no hay tasa para esa moneda, y quien llama debe
 * mostrar solo el precio original: es preferible no enseñar conversión a
 * enseñar una inventada.
 */
export function convertirImporte(
  importe: number | string,
  moneda: string,
  tasas: Record<string, number>,
): number | null {
  const tasa = tasas[moneda];
  if (typeof tasa !== 'number' || !Number.isFinite(tasa) || tasa <= 0) return null;

  const valor = typeof importe === 'string' ? Number(importe) : importe;
  if (!Number.isFinite(valor)) return null;

  return valor * tasa;
}
