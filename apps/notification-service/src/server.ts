import "./config/env";
import { createLogger } from "@civicpulse/shared-middleware";
import { buildApp } from "./app";
import { env } from "./config/env";
import { getTransporter } from "./dispatchers/email.dispatcher";
import { prisma } from "./prisma/client";
import { startComplaintConsumer } from "./consumers/complaint.consumer";
import { startUserConsumer } from "./consumers/user.consumer";

const logger = createLogger("notification-service");

async function main(): Promise<void> {
    const app = buildApp();
    const port = Number(env.PORT);

    if (env.NODE_ENV !== "production") {
        await getTransporter();
    }

    const server = app.listen(port, () => {
        logger.info("Notification service started", { port });
    });

    startComplaintConsumer().catch((error) => {
        logger.error("Failed to start complaint consumer", { err: String(error) });
    });

    startUserConsumer().catch((error) => {
        logger.error("Failed to start user consumer", { err: String(error) });
    });

    const shutdown = async (signal: string): Promise<void> => {
        logger.info("Shutting down notification service", { signal });
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
    logger.error("Notification service failed to start", { err: String(error) });
    process.exit(1);
});
