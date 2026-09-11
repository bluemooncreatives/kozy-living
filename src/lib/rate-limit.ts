import { headers } from "next/headers";

/**
 * Naive in-process throttle for public write endpoints.
 *
 * On serverless this is per-container, so it is a speed bump rather than a
 * guarantee - it stops a single browser hammering submit, not a distributed
 * flood. Shopify's own rate limits and the honeypots on each form cover the
 * rest; move this to a shared store (KV/Redis) if spam ever becomes real.
 *
 * Shared by the contact form and the newsletter so the two cannot drift apart,
 * and so a visitor who writes an enquiry is not also spending their newsletter
 * budget - each caller passes its own bucket name.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/** bucket + client key -> timestamps of recent attempts. */
const attempts = new Map<string, number[]>();

export function rateLimited(
  bucket: string,
  key: string,
  { windowMs = WINDOW_MS, max = MAX_PER_WINDOW } = {}
): boolean {
  const id = `${bucket}:${key}`;
  const now = Date.now();
  const recent = (attempts.get(id) ?? []).filter((at) => now - at < windowMs);

  if (recent.length >= max) {
    attempts.set(id, recent);
    return true;
  }

  recent.push(now);
  attempts.set(id, recent);

  // The map would otherwise grow for the life of the process.
  if (attempts.size > 5000) {
    for (const [entry, times] of attempts) {
      if (times.every((at) => now - at >= windowMs)) attempts.delete(entry);
    }
  }

  return false;
}

/**
 * Best-effort caller identity. Behind a proxy the first hop in
 * `x-forwarded-for` is the visitor; everything else falls back to one shared
 * "unknown" bucket, which is deliberately strict rather than permissive.
 */
export async function clientKey(): Promise<string> {
  const store = await headers();
  return (
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    store.get("x-real-ip") ||
    "unknown"
  );
}
