import { z } from 'zod';

export const checkoutSchema = z
  .object({
    recipientName: z.string().trim().min(2, 'Ingresa el nombre de quien recibe.'),
    line1: z.string().trim().min(5, 'Ingresa una dirección válida.'),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(2, 'Ingresa la ciudad.'),
    region: z.string().trim().min(2, 'Ingresa el departamento/región.'),
    postalCode: z.string().trim().min(3, 'Ingresa el código postal.'),
    country: z.string().trim().min(2),
    phone: z.string().trim().min(7, 'Ingresa un teléfono válido.'),
    paymentMethod: z.enum(['tarjeta_simulada', 'contra_entrega']),
    cardNumber: z.string().optional(),
    cardName: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvv: z.string().optional(),
  })
  .refine(
    (data) => data.paymentMethod !== 'tarjeta_simulada' || /^\d{16}$/.test(data.cardNumber ?? ''),
    {
      message: 'Número de tarjeta inválido (16 dígitos).',
      path: ['cardNumber'],
    },
  )
  .refine(
    (data) => data.paymentMethod !== 'tarjeta_simulada' || (data.cardName ?? '').trim().length > 1,
    {
      message: 'Ingresa el nombre en la tarjeta.',
      path: ['cardName'],
    },
  )
  .refine(
    (data) =>
      data.paymentMethod !== 'tarjeta_simulada' || /^\d{2}\/\d{2}$/.test(data.cardExpiry ?? ''),
    { message: 'Formato MM/AA.', path: ['cardExpiry'] },
  )
  .refine(
    (data) => data.paymentMethod !== 'tarjeta_simulada' || /^\d{3,4}$/.test(data.cardCvv ?? ''),
    {
      message: 'CVV inválido.',
      path: ['cardCvv'],
    },
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;
