import express from "express";
import cookieParser from "cookie-parser";
import { requestLogger, errorHandler } from "@civicpulse/shared-middleware";
import { createLogger } from "@civicpulse/shared-middleware";
import { prisma } from "./prisma/client";
import { createRedisClient } from "@civicpulse/shared-redis";
import complaintRoutes from "./routes/complaint.routes";

const logger = createLogger("complaint-service");

export function buildApp(): express.Application {
    const app = express();

    // ── Core middleware ─────────────────────────────────────────────────────────
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestLogger(logger));

    // ── Health endpoints (no internal-auth — used by gateway & Docker) ──────────
    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/api/v1/complaints/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/api/v1/complaints/ready", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (err) {
            res.status(503).json({ status: "error", detail: String(err) });
        }
    });

    // ── Routes (all protected by internal-auth middleware inside the router) ────
    app.use("/api/v1/complaints", complaintRoutes);

    // ── Global error handler ────────────────────────────────────────────────────
    app.use(errorHandler);

    return app;
}
