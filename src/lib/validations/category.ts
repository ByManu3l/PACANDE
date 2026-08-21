import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().trim().optional(),
  parentId: z.string().optional(),
  position: z.number().int(),
  isActive: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
