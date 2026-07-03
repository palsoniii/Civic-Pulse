import { PrismaClient } from "@prisma/client";

declare global {
    // eslint-disable-next-line no-var
    var __adminPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
    global.__adminPrisma ??
    new PrismaClient({
        log: process.env.LOG_LEVEL === "debug" ? ["query", "info", "warn", "error"] : ["warn", "error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.__adminPrisma = prisma;
}
