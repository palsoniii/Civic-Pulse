import express from "express";
import { createLogger, requestLogger, errorHandler } from "@civicpulse/shared-middleware";
import { createRedisClient } from "@civicpulse/shared-redis";
import { prisma } from "./prisma/client";
import notificationRoutes from "./routes/notification.routes";

const logger = createLogger("notification-service");

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

    app.get("/api/v1/notifications/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/api/v1/notifications/ready", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (error) {
            res.status(503).json({ status: "error", detail: String(error) });
        }
    });

    app.use("/api/v1/notifications", notificationRoutes);
    app.use(errorHandler);

    return app;
}
