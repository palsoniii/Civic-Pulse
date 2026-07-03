import express from "express";
import cookieParser from "cookie-parser";
import { requestLogger, errorHandler } from "@civicpulse/shared-middleware";
import { createLogger } from "@civicpulse/shared-middleware";
import { prisma } from "./prisma/client";
import { createRedisClient } from "@civicpulse/shared-redis";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";

export function buildApp(): express.Application {
    const app = express();
    const logger = createLogger("user-service");

    // ── Middleware ────────────────────────────────
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestLogger(logger));

    // ── Health / Readiness ────────────────────────
    app.get("/api/v1/users/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/api/v1/users/ready", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (err) {
            res.status(503).json({ status: "error", detail: String(err) });
        }
    });

    // ── Routes ────────────────────────────────────
    app.use("/api/v1/users", authRoutes);
    app.use("/api/v1/users", profileRoutes);

    // ── Error Handler ─────────────────────────────
    app.use(errorHandler);

    return app;
}
