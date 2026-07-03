import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.string().default("3005"),
    REDIS_URL: z.string().url(),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("[media-service] Invalid environment variables:");
    for (const issue of parsed.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = parsed.data;
