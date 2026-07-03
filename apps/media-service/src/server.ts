import "./config/env";
import { buildApp } from "./app";
import { env } from "./config/env";

async function main(): Promise<void> {
    const app = buildApp();
    const port = Number(env.PORT);

    const server = app.listen(port, () => {
        console.info(`[media-service] Listening on port ${port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
        console.info(`[media-service] Received ${signal}, shutting down...`);
        server.close(() => {
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
    console.error("[media-service] Fatal startup error:", error);
    process.exit(1);
});
