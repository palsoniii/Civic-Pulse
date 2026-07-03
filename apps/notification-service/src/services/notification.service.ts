import { createLogger } from "@civicpulse/shared-middleware";
import type {
    AppEvent,
    ComplaintCreatedPayload,
    StatusChangedPayload,
} from "@civicpulse/shared-types";
import { prisma } from "../prisma/client";
import {
    sendComplaintConfirmation,
    sendResolutionEmail,
    sendStatusUpdate,
} from "../dispatchers/email.dispatcher";
import { saveInAppNotification } from "../dispatchers/inapp.dispatcher";
import { sendSms } from "../dispatchers/sms.dispatcher";
import { getPreferences } from "./preference.service";

const logger = createLogger("notification-router");

function extractReporterId(event: AppEvent): string | null {
    const payload = event.payload as { reporter_id?: string; user_id?: string };
    return payload.reporter_id ?? payload.user_id ?? null;
}

export async function handleComplaintEvent(event: AppEvent): Promise<void> {
    const payload = event.payload as unknown as ComplaintCreatedPayload | StatusChangedPayload;
    const reporterId = extractReporterId(event);

    if (!reporterId) {
        logger.warn("Skipping event without reporter id", {
            event_type: event.event_type,
            event_id: event.event_id,
        });
        return;
    }

    const prefs = await getPreferences(reporterId);

    try {
        await saveInAppNotification(reporterId, event.event_type, payload);
    } catch (error) {
        logger.error("Failed to save in-app notification", {
            err: String(error),
            event_id: event.event_id,
        });
    }

    switch (event.event_type) {
        case "complaint.created":
            if (prefs.emailEnabled) {
                const userEmail = `user-${reporterId}@civicpulse.local`;
                await sendComplaintConfirmation(payload as ComplaintCreatedPayload, userEmail);
            }
            break;

        case "complaint.status_changed": {
            const statusPayload = payload as StatusChangedPayload;
            if (prefs.emailEnabled) {
                const userEmail = `user-${reporterId}@civicpulse.local`;
                if (statusPayload.to_status === "RESOLVED") {
                    await sendResolutionEmail(statusPayload, userEmail);
                } else {
                    await sendStatusUpdate(statusPayload, userEmail);
                }
            }

            if (statusPayload.to_status === "RESOLVED" && prefs.smsEnabled) {
                try {
                    await sendSms(
                        `+91-STUB-${reporterId.slice(0, 6)}`,
                        `Complaint resolved: #${statusPayload.complaint_id.slice(0, 8)}`
                    );

                    await prisma.notificationLog.create({
                        data: {
                            userId: reporterId,
                            eventType: event.event_type,
                            channel: "SMS",
                            payload: JSON.stringify(statusPayload),
                            status: "SENT",
                        },
                    });
                } catch (error) {
                    logger.error("Failed to dispatch SMS", {
                        err: String(error),
                        event_id: event.event_id,
                    });

                    try {
                        await prisma.notificationLog.create({
                            data: {
                                userId: reporterId,
                                eventType: event.event_type,
                                channel: "SMS",
                                payload: JSON.stringify(statusPayload),
                                status: "FAILED",
                                errorMessage: String(error),
                            },
                        });
                    } catch (logError) {
                        logger.error("Failed to persist failed SMS log", {
                            err: String(logError),
                            event_id: event.event_id,
                        });
                    }
                }
            }
            break;
        }

        case "complaint.assigned":
            break;

        default:
            logger.info("Ignoring unsupported complaint event", { event_type: event.event_type });
    }
}
