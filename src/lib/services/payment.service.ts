import { randomUUID } from 'node:crypto';

export interface PaymentResult {
  approved: boolean;
  reference?: string;
  declineReason?: string;
}

/**
 * The legacy checkout validated a card client-side and then simulated a
 * 10% random decline — no real gateway. Kept as-is on purpose (see the
 * template's README): a real integration means an external account and
 * API keys, which isn't what this template exists to demonstrate. This
 * interface is what a real provider (Stripe, Wompi, etc.) would implement
 * to replace SimulatedPaymentProvider without touching order.service.ts.
 */
export interface PaymentProvider {
  charge(amount: number, method: string): Promise<PaymentResult>;
}

class SimulatedPaymentProvider implements PaymentProvider {
  async charge(_amount: number, _method: string): Promise<PaymentResult> {
    const approved = Math.random() > 0.1;
    if (!approved) {
      return { approved: false, declineReason: 'Fondos insuficientes.' };
    }
    return { approved: true, reference: randomUUID() };
  }
}

export const paymentProvider: PaymentProvider = new SimulatedPaymentProvider();
