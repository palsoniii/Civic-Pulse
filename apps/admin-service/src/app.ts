import express from "express";
import { requestLogger, errorHandler, createLogger } from "@civicpulse/shared-middleware";
import { createRedisClient } from "@civicpulse/shared-redis";
import { prisma } from "./prisma/client";
import adminRoutes from "./routes/admin.routes";

const logger = createLogger("admin-service");

export function buildApp(): express.Application {
    const app = express();

    app.use(express.json());
    app.use(requestLogger(logger));

    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/ready", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (error) {
            res.status(503).json({ status: "error", detail: String(error) });
        }
    });

    app.get("/api/v1/admin/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/api/v1/admin/ready", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (error) {
            res.status(503).json({ status: "error", detail: String(error) });
        }
    });

    app.use("/api/v1/admin", adminRoutes);
    app.use(errorHandler);

    return app;
}
