import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

// Prisma 7's driver-adapter client needs the connection pool wired up
// explicitly (no more implicit binary engine reading DATABASE_URL).
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Reused across hot reloads in dev so we don't exhaust the Postgres
// connection pool with a new PrismaClient per module reload.
export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
