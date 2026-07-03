import { createLogger } from "@civicpulse/shared-middleware";
import {
    createConsumerGroup,
    startConsumer,
    startReclaimer,
} from "@civicpulse/shared-redis";
import type { AppEvent } from "@civicpulse/shared-types";
import { prisma } from "../prisma/client";

const logger = createLogger("complaint-service:consumer");

const STREAM = "media:events";
const GROUP = "media-link-group";
const CONSUMER = "complaint-service-media-consumer-1";

/**
 * Handler for media.uploaded events.
 * Creates a MediaRef row linking the uploaded media to its complaint.
 */
async function handleMediaEvent(event: AppEvent): Promise<void> {
    if (event.event_type !== "media.uploaded") return;

    const payload = event.payload as {
        complaint_id: string;
        url: string;
        thumbnail_url: string;
    };

    await prisma.mediaRef.create({
        data: {
            complaintId: payload.complaint_id,
            mediaUrl: payload.url,
            thumbnailUrl: payload.thumbnail_url,
            mediaType: "image",
        },
    });

    logger.info("media_ref_created", {
        complaint_id: payload.complaint_id,
        url: payload.url,
    });
}

/**
 * Bootstrap the media events consumer.
 * Called once on server startup.
 */
export async function startMediaConsumer(): Promise<void> {
    // Idempotent — no-op if group already exists
    await createConsumerGroup(STREAM, GROUP);

    startConsumer({
        stream: STREAM,
        group: GROUP,
        consumer: CONSUMER,
        handler: handleMediaEvent,
        batchSize: 10,
        blockMs: 2000,
    });

    // Reclaim stale PEL messages after 30s idle
    startReclaimer(STREAM, GROUP, CONSUMER);

    logger.info("media_consumer_started", { stream: STREAM, group: GROUP });
}
