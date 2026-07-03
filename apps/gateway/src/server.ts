import "./config/env"; // validate env at startup — exits on invalid config
import { buildApp } from "./app";
import { env } from "./config/env";

async function main(): Promise<void> {
    const app = buildApp();
    const port = Number(env.PORT);

    const server = app.listen(port, () => {
        console.info(`[gateway] Listening on port ${port}`);
    });

    // ── Graceful shutdown ───────────────────────────────────────────────────────
    const shutdown = async (signal: string): Promise<void> => {
        console.info(`[gateway] Received ${signal}, shutting down...`);
        server.close(() => {
            console.info("[gateway] Goodbye");
            process.exit(0);
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
    console.error("[gateway] Fatal startup error:", err);
    process.exit(1);
});
