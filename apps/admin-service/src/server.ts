import "./config/env";
import { createLogger } from "@civicpulse/shared-middleware";
import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma/client";
import { startTestConsumer } from "./events/test-consumer";

const logger = createLogger("admin-service");

async function main(): Promise<void> {
    const app = buildApp();
    const port = Number(env.PORT);

    const server = app.listen(port, () => {
        logger.info("Admin service started", { port });
    });

    if (env.NODE_ENV === "development") {
        startTestConsumer().catch((error) => {
            logger.error("Failed to start admin test consumer", { err: String(error) });
        });
    }

    const shutdown = async (signal: string): Promise<void> => {
        logger.info("Shutting down admin service", { signal });
        server.close(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
    };

    process.once("SIGINT", () => {
        void shutdown("SIGINT");
    });
    process.once("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
}

main().catch((error) => {
    logger.error("Admin service failed to start", { err: String(error) });
    process.exit(1);
});
