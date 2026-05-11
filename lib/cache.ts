interface CacheEntry<T> {
  data: T;
  ts: number;
}

const CACHE_PREFIX = "ysu-cache:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function cacheKey(parts: string[]): string {
  return parts.join("|");
}
