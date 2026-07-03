import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.string().default("3004"),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    SMTP_HOST: z.string().default("smtp.ethereal.email"),
    SMTP_PORT: z.string().default("587"),
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASS: z.string().optional().default(""),
    FROM_EMAIL: z.string().email().default("noreply@civicpulse.local"),
    POD_ID: z.string().default("1"),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("[notification-service] Invalid environment variables:");
    for (const issue of parsed.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env: Env = parsed.data;
