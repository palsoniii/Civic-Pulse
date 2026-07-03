import type { NotificationPreference } from "@prisma/client";
import { prisma } from "../prisma/client";

export async function getPreferences(userId: string): Promise<NotificationPreference> {
    const pref = await prisma.notificationPreference.findUnique({
        where: { userId },
    });

    return (
        pref ?? {
            userId,
            emailEnabled: true,
            smsEnabled: false,
            pushEnabled: true,
        }
    );
}

export async function upsertPreferences(
    userId: string,
    data: Partial<{
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
    }>
): Promise<NotificationPreference> {
    return prisma.notificationPreference.upsert({
        where: { userId },
        update: data,
        create: {
            userId,
            emailEnabled: data.emailEnabled ?? true,
            smsEnabled: data.smsEnabled ?? false,
            pushEnabled: data.pushEnabled ?? true,
        },
    });
}
