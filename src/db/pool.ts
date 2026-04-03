import { Pool } from "pg";

let pool: Pool | null = null;

function shouldUseSsl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const host = (u.hostname || "").toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

export function isTransientPgConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.message === "Connection terminated unexpectedly") return true;
  const c = err as NodeJS.ErrnoException;
  return c.code === "ECONNRESET" || c.code === "EPIPE" || c.code === "ETIMEDOUT";
}

export async function withPgRetry<T>(
  fn: () => Promise<T>,
  attempts = Number(process.env.PG_RETRY_ATTEMPTS || 4)
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientPgConnectionError(e) || i === attempts - 1) throw e;
      try {
        await closePool();
      } catch {}
      await new Promise((r) => setTimeout(r, 120 * (i + 1)));
    }
  }
  throw last;
}

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL не задан");
    }
    pool = new Pool({
      connectionString: url,
      max: Math.min(16, Math.max(4, Number(process.env.PGPOOL_MAX || 8))),
      connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECT_TIMEOUT_MS || 12000),
      idleTimeoutMillis: 10 * 60_000,
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: 60_000,
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
    pool.on("error", (err) => {
      console.error("[pg pool] background connection error:", err.message);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
