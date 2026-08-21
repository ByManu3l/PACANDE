'use server';

import { revalidatePath } from 'next/cache';

import { requireSession } from '@/lib/auth/guards';
import * as orderService from '@/lib/services/order.service';
import { runAction } from '@/lib/utils/action-result';
import { checkoutSchema } from '@/lib/validations/checkout';

export async function checkoutAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireSession();

    const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Datos de envío inválidos.');
    }

    const result = await orderService.checkout(user.id, parsed.data);
    revalidatePath('/carrito');
    revalidatePath('/cuenta/pedidos');

    if (!result.approved) {
      throw new Error(
        `Pago rechazado: ${result.declineReason ?? 'intenta con otro método.'} Tu carrito sigue intacto.`,
      );
    }

    return { orderNumber: result.order.orderNumber };
  });
}
