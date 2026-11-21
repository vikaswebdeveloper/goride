import { AppError } from "./errors";

// In-memory sliding window. Fine for a single instance / MVP.
// For multi-instance production deployments swap the store for Redis (e.g. Upstash) behind the same function.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    throw new AppError("RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Test helper */
export function __resetRateLimits() {
  hits.clear();
}
