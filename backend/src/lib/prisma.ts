import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function dbUrl() {
  // Prefer direct (non-pooler) URL for long-running Express — avoids Neon "Closed" drops
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  return url.replace(/[?&]channel_binding=require/gi, "").replace(/[?&]pgbouncer=true/gi, "");
}

function createPool() {
  return new Pool({
    connectionString: dbUrl(),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
    ssl: { rejectUnauthorized: false },
  });
}

function createPrisma() {
  const pool = globalForPrisma.pgPool ?? createPool();
  globalForPrisma.pgPool = pool;

  pool.on("error", (err) => {
    console.warn("[db] idle client error (will reconnect):", err.message);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      const closed =
        /closed|Connection reset|Server has closed|ECONNRESET|P1001|P1017|Connection terminated/i.test(
          msg,
        );
      if (!closed || i === attempts - 1) throw err;
      console.warn(`[db] retry ${i + 1}/${attempts} after:`, msg);
      try {
        await prisma.$connect();
      } catch {
        /* pool will open on next query */
      }
    }
  }
  throw last;
}
