import { config } from 'dotenv';
import { beforeEach } from 'vitest';

config({ path: '.env.test' });

if (!process.env.DATABASE_URL?.includes('pacande_test')) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL does not point at the test database ' +
      '(pacande_test). Check .env.test — this guard exists so a misconfigured ' +
      'test run can never truncate the dev database.',
  );
}

// Imported after the DATABASE_URL is guaranteed to be the test database.
const { prisma } = await import('@/lib/prisma');

/** Deletes all rows from every table, in FK-safe order. Runs before each
 * test so tests never see leftovers from a previous one. */
export async function resetDatabase() {
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderCounter.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await resetDatabase();
});
