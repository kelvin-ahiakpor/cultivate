import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const parsedPoolMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '1', 10);
const poolMax = Number.isFinite(parsedPoolMax) && parsedPoolMax > 0 ? parsedPoolMax : 1;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  poolErrorHandlerAttached: boolean | undefined;
};

// Keep one process-wide pool/client. In serverless this still scopes per warm instance,
// but it avoids stacking extra pools within the same runtime.
const pool = globalForPrisma.pool ?? new Pool({
  connectionString,
  max: poolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

if (!globalForPrisma.poolErrorHandlerAttached) {
  pool.on('error', (error) => {
    console.error('Postgres pool error:', error);
  });
  globalForPrisma.poolErrorHandlerAttached = true;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

globalForPrisma.pool = pool;
globalForPrisma.prisma = prisma;

function getErrorText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    const causeText =
      'cause' in error && error.cause ? ` ${getErrorText(error.cause)}` : '';
    return `${error.name} ${error.message}${causeText}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isDatabaseConnectionLimitError(error: unknown) {
  const normalized = getErrorText(error).toLowerCase();

  return (
    normalized.includes('maxclientsinsessionmode') ||
    normalized.includes('max clients reached') ||
    normalized.includes('session mode max clients are limited to pool_size') ||
    normalized.includes('too many clients')
  );
}

export async function recoverFromDatabaseError(error: unknown) {
  if (!isDatabaseConnectionLimitError(error)) {
    return false;
  }

  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('Failed to disconnect Prisma after pool exhaustion:', disconnectError);
  }

  return true;
}
