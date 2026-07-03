import { createConsumerGroup, startConsumer } from "@civicpulse/shared-redis";
import { createLogger } from "@civicpulse/shared-middleware";

const logger = createLogger("admin-test-consumer");

export async function startTestConsumer(): Promise<void> {
    if (process.env.NODE_ENV !== "development") {
        return;
    }

    await createConsumerGroup("complaints:events", "admin-test-group");

    startConsumer({
        stream: "complaints:events",
        group: "admin-test-group",
        consumer: "admin-test-1",
        handler: async (event) => {
            logger.info("[TEST CONSUMER] Event received", {
                event_id: event.event_id,
                event_type: event.event_type,
                payload: event.payload,
            });
        },
    });
}
