import { z } from 'zod';

/**
 * Dirección de la libreta del cliente.
 *
 * Deliberadamente permisivo con los formatos: no se valida el código
 * postal contra un patrón ni el teléfono contra una máscara. Esas reglas
 * cambian de un país a otro, y una plantilla que rechaza direcciones
 * válidas de otro mercado obliga a desactivarla en cuanto se despliega
 * fuera del país para el que se escribió. Lo que sí se comprueba es que
 * los campos obligatorios tengan contenido.
 *
 * Comparte forma con `checkoutSchema` a propósito: una dirección guardada
 * debe poder rellenar el formulario de checkout sin conversiones.
 */
export const addressSchema = z.object({
  /** Nombre que le da el cliente: «Casa», «Oficina». */
  label: z.string().trim().min(1, 'Ponle un nombre.').max(30),

  recipientName: z.string().trim().min(2, 'Escribe el nombre de quien recibe.'),
  line1: z.string().trim().min(5, 'La dirección es demasiado corta.'),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Escribe la ciudad.'),
  region: z.string().trim().min(2, 'Escribe el departamento o estado.'),
  postalCode: z.string().trim().min(3, 'Escribe el código postal.'),
  /** Código ISO de dos letras. Es lo que espera cualquier transportadora. */
  country: z.string().trim().length(2, 'Usa el código de dos letras, p. ej. CO.'),
  phone: z.string().trim().min(7, 'Escribe un teléfono de contacto.'),

  isDefault: z.boolean(),
});

export type AddressFormInput = z.infer<typeof addressSchema>;
