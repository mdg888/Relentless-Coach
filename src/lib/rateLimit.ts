export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions = {}
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  const retryAfterMs = windowMs - (now - existing.windowStart);
  return { allowed: false, retryAfterMs };
}
