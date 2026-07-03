import { createLogger } from "@civicpulse/shared-middleware";
import { publishEvent } from "../events/publishers";
import { prisma } from "../prisma/client";
import type { AppEvent } from "@civicpulse/shared-types";

const logger = createLogger("complaint-service:outbox");

const STREAM = "complaints:events";
const BATCH = 50;

/**
 * Polls unpublished outbox records and publishes them to Redis Streams.
 * On success: marks published=true + sets publishedAt.
 * On error:   logs and leaves record for retry on next interval.
 */
async function processOutbox(): Promise<void> {
    const pending = await prisma.outbox.findMany({
        where: { published: false },
        take: BATCH,
        orderBy: { createdAt: "asc" },
    });

    for (const record of pending) {
        try {
            const event = JSON.parse(record.payload) as AppEvent;
            await publishEvent(STREAM, event);

            await prisma.outbox.update({
                where: { id: record.id },
                data: { published: true, publishedAt: new Date() },
            });
        } catch (err) {
            logger.error("outbox_publish_failed", {
                outbox_id: record.id,
                event_type: record.eventType,
                err: String(err),
            });
            // Do NOT mark as published — will retry on next interval
        }
    }
}

// Start the polling loop — 500ms interval as per spec
setInterval(() => {
    processOutbox().catch((err) => {
        logger.error("outbox_worker_error", { err: String(err) });
    });
}, 500);

logger.info("outbox_worker_started", { interval_ms: 500, stream: STREAM });
