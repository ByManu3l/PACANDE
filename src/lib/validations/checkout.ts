import { z } from 'zod';

/**
 * Lo que el checkout necesita del cliente para crear el pedido: dirección
 * de envío y método de pago. **Nada más.**
 *
 * Este es el esquema que valida el servidor. Fíjate en lo que NO tiene:
 * ningún campo de tarjeta. Ver `checkoutFormSchema` abajo para el porqué.
 */
export const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2, 'Ingresa el nombre de quien recibe.'),
  line1: z.string().trim().min(5, 'Ingresa una dirección válida.'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Ingresa la ciudad.'),
  region: z.string().trim().min(2, 'Ingresa el departamento/región.'),
  postalCode: z.string().trim().min(3, 'Ingresa el código postal.'),
  country: z.string().trim().min(2),
  phone: z.string().trim().min(7, 'Ingresa un teléfono válido.'),
  paymentMethod: z.enum(['tarjeta_simulada', 'contra_entrega']),

  /**
   * Código del cupón, opcional. **Solo el código**, nunca el importe: el
   * descuento lo recalcula el servidor con el carrito real.
   */
  couponCode: z.string().trim().max(30).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Campos de tarjeta: existen solo para que el formulario simulado se vea
 * y se comporte como uno real. Nunca salen del navegador. */
const cardFields = {
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
};

const requiresCard = (method: string) => method === 'tarjeta_simulada';

/**
 * Esquema del formulario en el navegador: los campos del servidor **más**
 * los de la tarjeta, con sus reglas condicionales.
 *
 * ## Por qué está separado del esquema del servidor
 *
 * Los datos de tarjeta (PAN, CVV, vencimiento) **nunca se envían al
 * servidor**: se validan en el navegador para dar feedback al usuario y se
 * descartan ahí mismo. `CheckoutForm` construye el payload solo con las
 * claves de `checkoutSchema`.
 *
 * Esto no es una sutileza: en cuanto un número de tarjeta toca tu backend,
 * entra en el alcance de PCI-DSS y aparece en cualquier log de request,
 * traza de APM o reporte de error que capture el cuerpo de la petición.
 * Ninguna pasarela real quiere ese dato en tu servidor — Stripe, Wompi y
 * equivalentes entregan un componente que tokeniza en el cliente y te
 * devuelve un token opaco.
 *
 * Cuando reemplaces la pasarela simulada por una real, el patrón correcto
 * es: montar el componente del proveedor aquí, y enviar al servidor el
 * token que devuelve — no estos campos. Mantén esa separación.
 */
export const checkoutFormSchema = checkoutSchema
  .extend(cardFields)
  .refine((d) => !requiresCard(d.paymentMethod) || /^\d{16}$/.test(d.cardNumber ?? ''), {
    message: 'Número de tarjeta inválido (16 dígitos).',
    path: ['cardNumber'],
  })
  .refine((d) => !requiresCard(d.paymentMethod) || (d.cardName ?? '').trim().length > 1, {
    message: 'Ingresa el nombre en la tarjeta.',
    path: ['cardName'],
  })
  .refine((d) => !requiresCard(d.paymentMethod) || /^\d{2}\/\d{2}$/.test(d.cardExpiry ?? ''), {
    message: 'Formato MM/AA.',
    path: ['cardExpiry'],
  })
  .refine((d) => !requiresCard(d.paymentMethod) || /^\d{3,4}$/.test(d.cardCvv ?? ''), {
    message: 'CVV inválido.',
    path: ['cardCvv'],
  });

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

/** Claves que el servidor acepta. `CheckoutForm` itera sobre esta lista
 * para construir el payload, de modo que agregar un campo al formulario
 * nunca lo filtra al servidor por accidente. */
export const CHECKOUT_SERVER_FIELDS = Object.keys(checkoutSchema.shape) as Array<
  keyof CheckoutInput
>;
