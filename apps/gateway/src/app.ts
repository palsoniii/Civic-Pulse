import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import axios from "axios";
import { requestLogger, errorHandler } from "@civicpulse/shared-middleware";
import { createLogger } from "@civicpulse/shared-middleware";
import { createRedisClient } from "@civicpulse/shared-redis";
import { env } from "./config/env";
import { services } from "./config/services";
import { traceIdMiddleware } from "./middleware/traceId.middleware";
import usersRouter from "./routes/users.routes";
import complaintsRouter from "./routes/complaints.routes";
import adminRouter from "./routes/admin.routes";
import notificationsRouter from "./routes/notifications.routes";
import mediaRouter from "./routes/media.routes";

const logger = createLogger("gateway");

export function buildApp(): express.Application {
    const app = express();

    // ── CORS ─────────────────────────────────────────────────────────────────────
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    app.use(
        cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (e.g., curl, Postman, server-to-server)
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`CORS: origin ${origin} not allowed`));
                }
            },
            credentials: true, // required for cookie-based refresh token
            allowedHeaders: ["Content-Type", "Authorization"],
            exposedHeaders: ["X-Trace-Id"],
        })
    );

    // ── Core middleware ───────────────────────────────────────────────────────────
    app.use(express.json());
    app.use(cookieParser());
    app.use(traceIdMiddleware);
    app.use(requestLogger(logger));

    // ── Health endpoint (no auth required) ───────────────────────────────────────
    app.get("/health", async (_req, res) => {
        type ServiceStatus = "ok" | "degraded";

        const results = await Promise.allSettled(
            Object.entries(services).map(async ([name, url]) => {
                try {
                    await axios.get(`${url}/health`, { timeout: 3000 });
                    return { name, status: "ok" as ServiceStatus };
                } catch {
                    return { name, status: "degraded" as ServiceStatus };
                }
            })
        );

        const serviceStatuses = Object.fromEntries(
            results.map((r) => {
                const val = r.status === "fulfilled" ? r.value : { name: "unknown", status: "degraded" as ServiceStatus };
                return [val.name, val.status];
            })
        );

        const overallOk = Object.values(serviceStatuses).every((s) => s === "ok");

        res.status(overallOk ? 200 : 207).json({
            status: overallOk ? "ok" : "degraded",
            services: serviceStatuses,
        });
    });

    app.get("/ready", async (_req, res) => {
        try {
            const redis = createRedisClient();
            await redis.ping();
            res.status(200).json({ status: "ok" });
        } catch (error) {
            res.status(503).json({ status: "error", detail: String(error) });
        }
    });

    // ── Route groups ──────────────────────────────────────────────────────────────
    app.use("/api/v1/users", usersRouter);
    app.use("/api/v1/complaints", complaintsRouter);
    app.use("/api/v1/admin", adminRouter);
    app.use("/api/v1/notifications", notificationsRouter);
    app.use("/api/v1/media", mediaRouter);

    // ── Global error handler ──────────────────────────────────────────────────────
    app.use(errorHandler);

    return app;
}
