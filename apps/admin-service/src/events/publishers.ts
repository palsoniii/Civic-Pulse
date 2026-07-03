import { v4 as uuidv4 } from "uuid";
import { publishEvent } from "@civicpulse/shared-redis";
import type { AppEvent, ComplaintAssignedPayload } from "@civicpulse/shared-types";

const SERVICE_ORIGIN = "admin-service";

export interface ComplaintAssignedEventPayload extends ComplaintAssignedPayload {
    reporter_id: string;
}

export function buildEvent(eventType: string, payload: Record<string, unknown>): AppEvent {
    return {
        event_id: uuidv4(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
        service_origin: SERVICE_ORIGIN,
        payload,
    };
}

export async function publishComplaintAssigned(payload: ComplaintAssignedEventPayload): Promise<void> {
    const event = buildEvent("complaint.assigned", payload as unknown as Record<string, unknown>);
    await publishEvent("complaints:events", event);
}
