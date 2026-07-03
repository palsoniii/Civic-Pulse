import express from "express";
import { createLogger, errorHandler, requestLogger } from "@civicpulse/shared-middleware";
import { createRedisClient } from "@civicpulse/shared-redis";

const logger = createLogger("media-service");

export function buildApp(): express.Application {
    const app = express();

    app.use(express.json());
    app.use(requestLogger(logger));

    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/api/v1/media/ready", async (_req, res) => {
        try {
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (error) {
            res.status(503).json({ status: "error", detail: String(error) });
        }
    });

    app.all("/api/v1/media/*", (_req, res) => {
        res.status(501).json({
            error: "Media service is a placeholder in this workspace",
            code: "NOT_IMPLEMENTED",
        });
    });

    app.use(errorHandler);

    return app;
}
