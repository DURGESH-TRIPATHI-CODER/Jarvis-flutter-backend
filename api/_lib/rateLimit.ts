import type { AuthResult } from "./auth";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 30);
const MAX_BUCKETS = 1_000;

// In-memory fixed window. Serverless instances are ephemeral, so this limits
// per-instance bursts; enough for the MVP. Swap for a shared store when
// usage grows (documented in backend/README.md).
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(clientId: NonNullable<AuthResult["clientId"]>): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(clientId) ?? []).filter((t) => now - t < WINDOW_MS);

  if (hits.length >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - hits[0])) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(clientId, hits);

  if (buckets.size > MAX_BUCKETS) {
    for (const [key, times] of buckets) {
      if (times.every((t) => now - t >= WINDOW_MS)) {
        buckets.delete(key);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
