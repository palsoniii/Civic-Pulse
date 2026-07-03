import winston from "winston";

const SCRUB_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "authorization",
]);

function scrubSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SCRUB_FIELDS.has(key)) {
      result[key] = "[REDACTED]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = scrubSecrets(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const scrubFormat = winston.format((info) => {
  const scrubbed = scrubSecrets(info as unknown as Record<string, unknown>);
  for (const [key, value] of Object.entries(scrubbed)) {
    (info as Record<string, unknown>)[key] = value;
  }
  return info;
});

export function createLogger(serviceName: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.combine(
      scrubFormat(),
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [new winston.transports.Console()],
  });
}
