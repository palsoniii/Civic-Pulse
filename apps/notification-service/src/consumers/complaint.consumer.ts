import { createLogger } from "@civicpulse/shared-middleware";
import { createConsumerGroup, startConsumer, startReclaimer } from "@civicpulse/shared-redis";
import { handleComplaintEvent } from "../services/notification.service";

const logger = createLogger("notification-complaint-consumer");

export async function startComplaintConsumer(): Promise<void> {
    logger.info("Starting complaint events consumer...");

    await createConsumerGroup("complaints:events", "notification-group");

    startConsumer({
        stream: "complaints:events",
        group: "notification-group",
        consumer: `notifier-${process.env.POD_ID ?? "1"}`,
        handler: async (event) => {
            logger.info("Processing complaint event", {
                event_id: event.event_id,
                event_type: event.event_type,
            });
            await handleComplaintEvent(event);
        },
        batchSize: 10,
        blockMs: 2000,
    });

    startReclaimer("complaints:events", "notification-group", `notifier-reclaimer-${process.env.POD_ID ?? "1"}`);
}
