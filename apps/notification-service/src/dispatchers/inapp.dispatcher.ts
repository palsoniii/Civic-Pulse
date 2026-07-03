import { prisma } from "../prisma/client";

export async function saveInAppNotification(
    userId: string,
    eventType: string,
    payload: unknown
): Promise<void> {
    await prisma.notificationLog.create({
        data: {
            userId,
            eventType,
            channel: "IN_APP",
            payload: JSON.stringify(payload),
            status: "SENT",
        },
    });
}
