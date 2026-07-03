import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.string().default("3000"),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    USER_SERVICE_URL: z.string().url(),
    COMPLAINT_SERVICE_URL: z.string().url(),
    ADMIN_SERVICE_URL: z.string().url(),
    NOTIFICATION_SERVICE_URL: z.string().url(),
    MEDIA_SERVICE_URL: z.string().url(),
    ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success) {
    console.error("[gateway] Invalid environment variables:");
    for (const issue of _parsed.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env: Env = _parsed.data;
