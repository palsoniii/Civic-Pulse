import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createRedisClient } from "@civicpulse/shared-redis";
import { env } from "../config/env";

export interface JWTPayload {
    sub: string;   // user id
    role: string;  // UserRole
    email: string;
    jti: string;   // JWT ID — used for revocation checks
    iat?: number;
    exp?: number;
}

const redis = createRedisClient();

/**
 * Auth middleware — CRITICAL path:
 *  1. Extract Bearer token from Authorization header
 *  2. Verify JWT signature and expiry
 *  3. Check Redis revocation set (jti:{jti})
 *  4. Inject trusted internal headers for downstream services
 *  5. STRIP the Authorization header so downstream services never see the raw JWT
 */
export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        res.status(401).json({ error: "No token", code: "NO_TOKEN" });
        return;
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

        // ── Revocation check ────────────────────────────────────────
        const revoked = await redis.get(`jti:${payload.jti}`);
        if (revoked) {
            res.status(401).json({ error: "Token revoked", code: "TOKEN_REVOKED" });
            return;
        }

        // ── Inject trusted internal headers ─────────────────────────
        req.headers["x-user-id"] = payload.sub;
        req.headers["x-user-role"] = payload.role;
        req.headers["x-user-email"] = payload.email;
        req.headers["x-token-jti"] = payload.jti;
        if (payload.exp) {
            req.headers["x-token-exp"] = String(payload.exp);
        }
        req.headers["x-internal-service"] = "gateway";

        // ── Strip raw JWT so downstream services never see it ───────
        delete req.headers["authorization"];

        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
            return;
        }
        res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
    }
}
