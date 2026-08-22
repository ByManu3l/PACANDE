import { hashSync } from 'bcryptjs';

import { prisma } from '@/lib/prisma';

let counter = 0;
/** Deterministic-enough uniqueness within a single test run (no
 * Date.now()/crypto needed for this). */
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

export async function createUser(
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  }> = {},
) {
  const email = overrides.email ?? `${unique('user')}@test.local`;
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email,
      passwordHash: hashSync(overrides.password ?? 'Password123!', 4), // low cost: tests only
      role: overrides.role ?? 'USER',
    },
  });
}

export async function createCategory(overrides: Partial<{ name: string; slug: string }> = {}) {
  const slug = overrides.slug ?? unique('category');
  return prisma.category.create({
    data: { name: overrides.name ?? 'Test Category', slug },
  });
}

export async function createProduct(
  categoryId: string,
  overrides: Partial<{ name: string; slug: string; price: number; stock: number }> = {},
) {
  const slug = overrides.slug ?? unique('product');
  return prisma.product.create({
    data: {
      name: overrides.name ?? 'Test Product',
      slug,
      description: 'A product used in tests.',
      price: overrides.price ?? 10000,
      stock: overrides.stock ?? 10,
      images: ['/images/test.jpg'],
      categoryId,
    },
  });
}
