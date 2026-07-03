import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "@civicpulse/shared-middleware";
import { RegisterUserSchema, LoginSchema } from "@civicpulse/shared-types";
import { prisma } from "../prisma/client";
import { hashPassword, verifyPassword, issueTokens, rotateRefreshToken, logout } from "../services/auth.service";
import { publishUserRegistered } from "../events/publishers";

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function setRefreshCookie(res: Response, token: string): void {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: REFRESH_COOKIE_MAX_AGE,
    });
}

// ─────────────────────────────────────────────
// POST /api/v1/users/register
// ─────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = RegisterUserSchema.parse(req.body);

        const existing = await prisma.user.findUnique({ where: { email: body.email } });
        if (existing) {
            throw new AppError(409, "Email already registered", "EMAIL_CONFLICT");
        }

        const passwordHash = await hashPassword(body.password);
        const user = await prisma.user.create({
            data: {
                id: uuidv4(),
                email: body.email,
                passwordHash,
                phone: body.phone,
            },
        });

        await publishUserRegistered(user.id, user.email);

        res.status(201).json({ id: user.id, email: user.email, role: user.role });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// POST /api/v1/users/login
// ─────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = LoginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email: body.email } });
        if (!user) {
            throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
        }

        const valid = await verifyPassword(body.password, user.passwordHash);
        if (!valid) {
            throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
        }

        const { accessToken, refreshToken } = await issueTokens(user);
        setRefreshCookie(res, refreshToken);

        res.status(200).json({
            accessToken,
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// POST /api/v1/users/refresh
// ─────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const rawRefreshToken: string | undefined = req.cookies?.["refreshToken"];
        if (!rawRefreshToken) {
            throw new AppError(401, "No refresh token", "NO_REFRESH_TOKEN");
        }

        const { accessToken, refreshToken } = await rotateRefreshToken(rawRefreshToken);
        setRefreshCookie(res, refreshToken);

        res.status(200).json({ accessToken });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// POST /api/v1/users/logout
// ─────────────────────────────────────────────

export async function logoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const jti = req.headers["x-token-jti"] as string | undefined;
        const rawRefreshToken: string | undefined = req.cookies?.["refreshToken"];

        if (!jti) {
            throw new AppError(400, "Missing token identifier", "MISSING_TOKEN_JTI");
        }

        await logout(jti, rawRefreshToken);

        res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        next(err);
    }
}
