import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.string().default("3001"),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRY: z.string().default("15m"),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success) {
    console.error("[config] Invalid environment variables:");
    for (const issue of _parsed.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env: Env = _parsed.data;
