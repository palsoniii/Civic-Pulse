import { v4 as uuidv4 } from "uuid";
import { publishEvent } from "@civicpulse/shared-redis";
import type { AppEvent, UserRegisteredPayload } from "@civicpulse/shared-types";

const SERVICE_ORIGIN = "user-service";

export async function publishUserRegistered(userId: string, email: string): Promise<void> {
    const payload: UserRegisteredPayload = { user_id: userId, email };

    const event: AppEvent = {
        event_id: uuidv4(),
        event_type: "user.registered",
        timestamp: new Date().toISOString(),
        service_origin: SERVICE_ORIGIN,
        payload: payload as unknown as Record<string, unknown>,
    };

    await publishEvent("user:events", event);
}
