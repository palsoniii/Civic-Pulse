import { createRedisClient } from "@civicpulse/shared-redis";

const redis = createRedisClient();

const DETAIL_TTL = 30;  // seconds
const LIST_TTL = 60;  // seconds
const DETAIL_PREFIX = "complaints:detail:";
const LIST_PREFIX = "complaints:list:";

// ─────────────────────────────────────────────
// Detail cache — single complaint with history
// ─────────────────────────────────────────────

export async function getCachedDetail(id: string): Promise<unknown | null> {
    const raw = await redis.get(`${DETAIL_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
}

export async function setCachedDetail(id: string, data: unknown): Promise<void> {
    await redis.set(`${DETAIL_PREFIX}${id}`, JSON.stringify(data), "EX", DETAIL_TTL);
}

export async function invalidateDetail(id: string): Promise<void> {
    await redis.del(`${DETAIL_PREFIX}${id}`);
}

// ─────────────────────────────────────────────
// List cache — paginated complaint lists
// ─────────────────────────────────────────────

export async function getCachedList(cacheKey: string): Promise<unknown | null> {
    const raw = await redis.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
}

export async function setCachedList(cacheKey: string, data: unknown): Promise<void> {
    await redis.set(cacheKey, JSON.stringify(data), "EX", LIST_TTL);
}

/**
 * Invalidate all list cache keys via SCAN.
 * Called after any status change to prevent stale list results.
 */
export async function invalidateListKeys(): Promise<void> {
    let cursor = "0";
    do {
        const [nextCursor, keys] = await redis.scan(
            cursor,
            "MATCH",
            `${LIST_PREFIX}*`,
            "COUNT",
            100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } while (cursor !== "0");
}

/**
 * Build a canonical list cache key from query params.
 * Format: complaints:list:{status}:{category}:{page}
 */
export function buildListCacheKey(
    status: string | undefined,
    category: string | undefined,
    page: number
): string {
    return `${LIST_PREFIX}${status ?? "ALL"}:${category ?? "ALL"}:${page}`;
}
