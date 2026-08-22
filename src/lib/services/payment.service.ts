import { randomUUID } from 'node:crypto';

/**
 * Pasarela de pago.
 *
 * **Este módulo es el punto de sustitución más importante de la
 * plantilla.** El cobro está simulado a propósito: integrar Stripe, Wompi
 * o Mercado Pago de verdad exige una cuenta, claves y webhooks propios de
 * cada negocio, así que la plantilla define el contrato y deja la
 * implementación real a quien la adopte.
 *
 * Todo lo que hay alrededor —descuento de stock, congelado de precios,
 * numeración de pedidos, transacciones— **no** está simulado y no hay que
 * rehacerlo. Ver `docs/PERSONALIZACION.md` para el procedimiento de
 * sustitución.
 */

export interface PaymentResult {
  approved: boolean;
  /** Referencia del cobro en la pasarela. Solo si fue aprobado. */
  reference?: string;
  /** Motivo del rechazo, en texto mostrable al cliente. */
  declineReason?: string;
}

/**
 * Contrato que debe cumplir cualquier pasarela.
 *
 * Es deliberadamente mínimo: `order.service.ts` solo necesita saber si el
 * cobro salió bien. Mientras una implementación respete esta interfaz,
 * sustituirla no obliga a tocar la lógica de pedidos.
 *
 * Una integración real tendrá que añadir además un endpoint de webhook:
 * las pasarelas confirman los pagos de forma asíncrona y ese aviso es la
 * fuente de verdad, no el valor devuelto aquí.
 *
 * @param amount Importe total, en la unidad principal de la moneda.
 * @param method Identificador del método (`Order.paymentMethod`).
 */
export interface PaymentProvider {
  charge(amount: number, method: string): Promise<PaymentResult>;
}

/**
 * Implementación de demostración: aprueba el 90 % de los intentos.
 *
 * El rechazo aleatorio existe para que la rama de error sea visible
 * durante el desarrollo. Es la única parte del checkout que no refleja un
 * comportamiento real, y está aislada aquí precisamente para que se note.
 */
class SimulatedPaymentProvider implements PaymentProvider {
  async charge(_amount: number, _method: string): Promise<PaymentResult> {
    const approved = Math.random() > 0.1;
    if (!approved) {
      return { approved: false, declineReason: 'Fondos insuficientes.' };
    }
    return { approved: true, reference: randomUUID() };
  }
}

/**
 * Instancia en uso. Cámbiala por tu implementación real: es el único
 * punto del proyecto que hay que tocar para conectar una pasarela.
 */
export const paymentProvider: PaymentProvider = new SimulatedPaymentProvider();
