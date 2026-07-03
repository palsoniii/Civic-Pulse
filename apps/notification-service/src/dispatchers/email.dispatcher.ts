import nodemailer from "nodemailer";
import { createLogger } from "@civicpulse/shared-middleware";
import type {
    ComplaintCreatedPayload,
    StatusChangedPayload,
    UserRegisteredPayload,
} from "@civicpulse/shared-types";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

const logger = createLogger("notification-email");

let transporter: nodemailer.Transporter | null = null;

async function writeEmailLog(
    userId: string,
    eventType: string,
    payload: unknown,
    status: "SENT" | "FAILED",
    errorMessage?: string
): Promise<void> {
    await prisma.notificationLog.create({
        data: {
            userId,
            eventType,
            channel: "EMAIL",
            payload: JSON.stringify(payload),
            status,
            errorMessage,
        },
    });
}

async function sendEmail({
    userId,
    userEmail,
    eventType,
    payload,
    subject,
    text,
}: {
    userId: string;
    userEmail: string;
    eventType: string;
    payload: unknown;
    subject: string;
    text: string;
}): Promise<void> {
    try {
        const mailer = await getTransporter();
        const info = await mailer.sendMail({
            from: env.FROM_EMAIL,
            to: userEmail,
            subject,
            text,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            logger.info("Email preview URL generated", { preview_url: previewUrl });
        }

        await writeEmailLog(userId, eventType, payload, "SENT");
    } catch (error) {
        logger.error("Email delivery failed", {
            err: String(error),
            eventType,
            userEmail,
        });

        try {
            await writeEmailLog(userId, eventType, payload, "FAILED", String(error));
        } catch (logError) {
            logger.error("Failed to persist failed email log", {
                err: String(logError),
                eventType,
            });
        }
    }
}

export async function getTransporter(): Promise<nodemailer.Transporter> {
    if (transporter) {
        return transporter;
    }

    if (env.NODE_ENV !== "production") {
        const testAccount = await nodemailer.createTestAccount();
        console.log("[notification-service] Ethereal test account:", testAccount.user, testAccount.pass);

        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        return transporter;
    }

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });

    return transporter;
}

export async function sendComplaintConfirmation(
    payload: ComplaintCreatedPayload,
    userEmail: string
): Promise<void> {
    await sendEmail({
        userId: payload.reporter_id,
        userEmail,
        eventType: "complaint.created",
        payload,
        subject: `CivicPulse - Complaint #${payload.complaint_id.slice(0, 8)} Received`,
        text: `Your complaint has been received. Category: ${payload.category}. We will keep you updated.`,
    });
}

export async function sendStatusUpdate(
    payload: StatusChangedPayload,
    userEmail: string
): Promise<void> {
    await sendEmail({
        userId: payload.reporter_id,
        userEmail,
        eventType: "complaint.status_changed",
        payload,
        subject: `CivicPulse - Complaint Status Updated to ${payload.to_status}`,
        text: `Your complaint #${payload.complaint_id.slice(0, 8)} has been updated from ${payload.from_status} to ${payload.to_status}.`,
    });
}

export async function sendResolutionEmail(
    payload: StatusChangedPayload,
    userEmail: string
): Promise<void> {
    await sendEmail({
        userId: payload.reporter_id,
        userEmail,
        eventType: "complaint.status_changed",
        payload,
        subject: "CivicPulse - Your Complaint Has Been Resolved",
        text: `Your complaint #${payload.complaint_id.slice(0, 8)} has been resolved. Thank you for reporting.`,
    });
}

export async function sendWelcomeEmail(payload: UserRegisteredPayload): Promise<void> {
    await sendEmail({
        userId: payload.user_id,
        userEmail: payload.email,
        eventType: "user.registered",
        payload,
        subject: "Welcome to CivicPulse",
        text: `Welcome! Your account ${payload.email} is ready. Start reporting civic issues at civicpulse.local.`,
    });
}
