/**
 * Esquemas de acceso y registro.
 *
 * Cada esquema de `lib/validations/*` se usa **dos veces**: en el
 * navegador lo consume `react-hook-form` vía `zodResolver` para mostrar
 * errores mientras se escribe, y en el servidor la Server Action vuelve a
 * ejecutar el mismo `parse` antes de tocar la base de datos.
 *
 * La validación del navegador es comodidad, no seguridad: cualquiera
 * puede invocar la Server Action directamente saltándose el formulario.
 * Compartir el esquema garantiza que ambas comprobaciones no se
 * desincronicen — que es exactamente lo que pasa cuando se escriben por
 * separado.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Correo inválido'),
  // Sin mínimo de longitud a propósito: aquí solo se comprueba que no
  // esté vacío. Exigir 8 caracteres al *entrar* rechazaría a usuarios
  // antiguos si mañana sube el mínimo, y además revelaría la regla a
  // quien intente adivinar contraseñas.
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.email('Correo inválido'),
  // Mínimo de 8 caracteres, el umbral que recomienda el NIST. No se
  // exigen mayúsculas ni símbolos: esas reglas empujan a la gente hacia
  // patrones predecibles ("Password1!") sin ganar entropía real.
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
