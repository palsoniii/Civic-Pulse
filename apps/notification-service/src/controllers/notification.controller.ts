import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "@civicpulse/shared-middleware";
import { prisma } from "../prisma/client";
import { getPreferences, upsertPreferences } from "../services/preference.service";

const UpdatePreferencesSchema = z
    .object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
    })
    .strict();

function getUserId(req: Request): string {
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) {
        throw new AppError(400, "Missing x-user-id header", "MISSING_USER_ID");
    }
    return userId;
}

export async function getMyNotificationsHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = getUserId(req);
        const data = await prisma.notificationLog.findMany({
            where: { userId },
            orderBy: { sentAt: "desc" },
            take: 50,
        });

        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
}

export async function markNotificationReadHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = getUserId(req);
        const log = await prisma.notificationLog.findUnique({
            where: { id: req.params.id },
        });

        if (!log) {
            throw new AppError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
        }

        if (log.userId !== userId) {
            throw new AppError(403, "Notification does not belong to user", "FORBIDDEN");
        }

        const updated = await prisma.notificationLog.update({
            where: { id: log.id },
            data: { read: true },
        });

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export async function getPreferencesHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = getUserId(req);
        const prefs = await getPreferences(userId);
        res.status(200).json(prefs);
    } catch (error) {
        next(error);
    }
}

export async function updatePreferencesHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = getUserId(req);
        const body = UpdatePreferencesSchema.parse(req.body);
        const prefs = await upsertPreferences(userId, body);
        res.status(200).json(prefs);
    } catch (error) {
        next(error);
    }
}
