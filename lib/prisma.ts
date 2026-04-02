import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Cache the Pool in globalThis — without this, every hot reload creates a new Pool
// whose connections are never released, eventually exhausting Supabase's connection limit.
const pool = globalForPrisma.pool ?? new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 1 : 3,
  });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}