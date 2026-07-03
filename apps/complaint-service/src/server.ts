import "./config/env"; // validate env first — exits on bad config
import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma/client";

async function main(): Promise<void> {
    const app = buildApp();
    const port = Number(env.PORT);

    // Bootstrap background workers after app is built
    // (import side-effects start the interval / consumer loops)
    await import("./outbox/worker");
    const { startMediaConsumer } = await import("./events/consumers");
    await startMediaConsumer();

    const server = app.listen(port, () => {
        console.info(`[complaint-service] Listening on port ${port}`);
    });

    // ── Graceful shutdown ───────────────────────────────────────────────────────
    const shutdown = async (signal: string): Promise<void> => {
        console.info(`[complaint-service] Received ${signal}, shutting down...`);
        server.close(async () => {
            await prisma.$disconnect();
            console.info("[complaint-service] Goodbye");
            process.exit(0);
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
    console.error("[complaint-service] Fatal startup error:", err);
    process.exit(1);
});
