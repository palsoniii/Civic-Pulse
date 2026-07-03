import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "@civicpulse/shared-middleware";
import { prisma } from "../prisma/client";
import { createRedisClient } from "@civicpulse/shared-redis";
import { env } from "../config/env";
import type { User } from "@prisma/client";

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 7;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    jti: string;
}

export interface JwtPayload {
    sub: string;
    role: string;
    email: string;
    jti: string;
}

function parseDurationToSeconds(raw: string): number {
    const match = raw.trim().match(/^(\d+)([smhd]?)$/i);
    if (!match) {
        throw new AppError(500, "Invalid JWT expiry configuration", "INVALID_JWT_EXPIRY");
    }

    const value = Number(match[1]);
    const unit = (match[2] || "s").toLowerCase();

    switch (unit) {
        case "s":
            return value;
        case "m":
            return value * 60;
        case "h":
            return value * 60 * 60;
        case "d":
            return value * 24 * 60 * 60;
        default:
            throw new AppError(500, "Invalid JWT expiry configuration", "INVALID_JWT_EXPIRY");
    }
}

const ACCESS_TOKEN_TTL = env.JWT_EXPIRY;
const ACCESS_TOKEN_TTL_SECONDS = parseDurationToSeconds(ACCESS_TOKEN_TTL);
const ACCESS_TOKEN_TTL_OPTION = ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"];

// ─────────────────────────────────────────────
// Hash helpers
// ─────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

async function hashToken(raw: string): Promise<string> {
    return bcrypt.hash(raw, BCRYPT_ROUNDS);
}

// ─────────────────────────────────────────────
// issueTokens
// ─────────────────────────────────────────────

export async function issueTokens(user: User, family?: string): Promise<TokenPair> {
    const jti = uuidv4();
    const tokenFamily = family ?? uuidv4();

    const accessToken = jwt.sign(
        { sub: user.id, role: user.role, email: user.email, jti },
        env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL_OPTION }
    );

    const rawRefresh = uuidv4();
    const tokenHash = await hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000);

    await prisma.refreshToken.create({
        data: { tokenHash, userId: user.id, expiresAt, family: tokenFamily },
    });

    return { accessToken, refreshToken: rawRefresh, jti };
}

// ─────────────────────────────────────────────
// rotateRefreshToken
// ─────────────────────────────────────────────

export async function rotateRefreshToken(rawRefreshToken: string): Promise<TokenPair> {
    // Fetch all non-revoked tokens and compare hashes (bcrypt compare)
    // Since tokens are UUIDs we can't do a db-level lookup; scan recent tokens.
    // Better: we store the raw token hashed — we must iterate candidate records.
    // For efficiency we'll limit to unexpired tokens for the IP / user — here we
    // just fetch all unexpired tokens and compare.  In production you'd add an
    // indexed prefix. This is acceptable for our scale.

    const candidates = await prisma.refreshToken.findMany({
        where: { expiresAt: { gt: new Date() } },
        include: { user: true },
    });

    let matched: (typeof candidates)[0] | null = null;
    for (const candidate of candidates) {
        const ok = await bcrypt.compare(rawRefreshToken, candidate.tokenHash);
        if (ok) { matched = candidate; break; }
    }

    if (!matched) {
        throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH");
    }

    if (matched.revoked) {
        // Token reuse detected — revoke entire family
        await prisma.refreshToken.updateMany({
            where: { family: matched.family },
            data: { revoked: true },
        });
        throw new AppError(401, "Refresh token reused — session revoked", "TOKEN_REUSE");
    }

    if (matched.expiresAt < new Date()) {
        throw new AppError(401, "Refresh token expired", "TOKEN_EXPIRED");
    }

    // Revoke the old token
    await prisma.refreshToken.update({
        where: { id: matched.id },
        data: { revoked: true },
    });

    // Issue new pair with same family
    return issueTokens(matched.user, matched.family);
}

// ─────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────

export async function logout(jti: string, rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
        const candidates = await prisma.refreshToken.findMany({
            where: { revoked: false, expiresAt: { gt: new Date() } },
        });

        for (const candidate of candidates) {
            const ok = await bcrypt.compare(rawRefreshToken, candidate.tokenHash);
            if (ok) {
                await prisma.refreshToken.update({
                    where: { id: candidate.id },
                    data: { revoked: true },
                });
                break;
            }
        }
    }

    const redis = createRedisClient();
    await redis.set(`jti:${jti}`, "1", "EX", ACCESS_TOKEN_TTL_SECONDS);
}
