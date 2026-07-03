import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { createRedisClient } from "@civicpulse/shared-redis";
import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimitMiddleware } from "../middleware/ratelimit.middleware";
import { services } from "../config/services";
import { createServiceProxy } from "./proxy.utils";

const router = Router();
const redis = createRedisClient();

/**
 * User-service proxy rules:
 *   POST /register  → public (no auth)
 *   POST /login     → public (no auth)
 *   POST /refresh   → public (uses httpOnly cookie — no Bearer token)
 *   /**             → auth required + rate limited
 */

const proxy = createServiceProxy(services.users);

async function revokeAccessToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jti = req.headers["x-token-jti"];
    const exp = req.headers["x-token-exp"];

    if (typeof jti === "string" && typeof exp === "string") {
      const ttlSeconds = Math.max(Number(exp) - Math.floor(Date.now() / 1000), 1);
      await redis.set(`jti:${jti}`, "1", "EX", ttlSeconds);
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ── Public routes (no auth) ───────────────────────────────────────────────────
router.post("/register", proxy);
router.post("/login", proxy);
router.post("/refresh", proxy);
router.post("/logout", authMiddleware, rateLimitMiddleware(), revokeAccessToken, proxy);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(authMiddleware, rateLimitMiddleware(), proxy);

export default router;
