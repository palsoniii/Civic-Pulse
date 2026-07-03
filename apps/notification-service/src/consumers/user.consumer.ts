import { createConsumerGroup, startConsumer, startReclaimer } from "@civicpulse/shared-redis";
import type { UserRegisteredPayload } from "@civicpulse/shared-types";
import { createLogger } from "@civicpulse/shared-middleware";
import { sendWelcomeEmail } from "../dispatchers/email.dispatcher";
import { upsertPreferences } from "../services/preference.service";

const logger = createLogger("notification-user-consumer");

export async function startUserConsumer(): Promise<void> {
    await createConsumerGroup("user:events", "notification-user-group");

    startConsumer({
        stream: "user:events",
        group: "notification-user-group",
        consumer: `notifier-user-${process.env.POD_ID ?? "1"}`,
        handler: async (event) => {
            if (event.event_type !== "user.registered") {
                return;
            }

            const payload = event.payload as unknown as UserRegisteredPayload;
            await upsertPreferences(payload.user_id, {});
            await sendWelcomeEmail(payload);
            logger.info("Processed user.registered event", { user_id: payload.user_id });
        },
    });

    startReclaimer("user:events", "notification-user-group", `notifier-user-reclaimer-${process.env.POD_ID ?? "1"}`);
}
