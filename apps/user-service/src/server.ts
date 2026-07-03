import "./config/env"; // validate env first
import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma/client";
import { createRedisClient } from "@civicpulse/shared-redis";

async function main(): Promise<void> {
    const app = buildApp();
    const port = Number(env.PORT);

    const server = app.listen(port, () => {
        console.info(`[user-service] Listening on port ${port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
        console.info(`[user-service] Received ${signal}, shutting down...`);
        server.close(async () => {
            await prisma.$disconnect();
            console.info("[user-service] Goodbye");
            process.exit(0);
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
    console.error("[user-service] Fatal startup error:", err);
    process.exit(1);
});
