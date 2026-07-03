import { Request, Response, NextFunction, RequestHandler } from "express";
import { createRedisClient } from "@civicpulse/shared-redis";

const redis = createRedisClient();

/**
 * Redis sliding-window rate limiter.
 *
 * Algorithm: INCR + EXPIRE (approximation of a sliding window).
 * Key format: ratelimit:{userId ?? ip}:{windowSec}
 *
 * @param limit     Maximum requests per window (default 100)
 * @param windowSec Window size in seconds (default 60)
 */
export function rateLimitMiddleware(limit = 100, windowSec = 60): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const identifier = (req.headers["x-user-id"] as string | undefined) ?? req.ip ?? "unknown";
        const key = `ratelimit:${identifier}:${windowSec}`;

        const count = await redis.incr(key);
        if (count === 1) {
            // First request in this window — set the expiry
            await redis.expire(key, windowSec);
        }

        if (count > limit) {
            res.status(429).json({ error: "Rate limit exceeded", code: "RATE_LIMITED" });
            return;
        }

        next();
    };
}
