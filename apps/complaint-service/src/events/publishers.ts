import { v4 as uuid } from "uuid";
import { publishEvent as _publishEvent } from "@civicpulse/shared-redis";
import type { AppEvent } from "@civicpulse/shared-types";

const SERVICE_ORIGIN = "complaint-service";

/**
 * Wraps a raw payload into a full AppEvent envelope.
 */
export function buildEvent(
    eventType: string,
    payload: Record<string, unknown>
): AppEvent {
    return {
        event_id: uuid(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
        service_origin: SERVICE_ORIGIN,
        payload,
    };
}

/**
 * Publishes an AppEvent to a Redis Stream.
 * Used by the outbox worker — not called directly from service layer.
 */
export async function publishEvent(stream: string, event: AppEvent): Promise<void> {
    await _publishEvent(stream, event);
}
