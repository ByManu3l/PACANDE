import { z } from 'zod';

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.email('Correo inválido'),
  password: z.string().min(8, 'Al menos 8 caracteres').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']).optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
