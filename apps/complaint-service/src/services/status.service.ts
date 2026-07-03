import { AppError } from "@civicpulse/shared-middleware";
import { ComplaintStatus } from "@prisma/client";

// ─────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
    OPEN: ["IN_PROGRESS", "REJECTED"],
    IN_PROGRESS: ["RESOLVED", "OPEN"],
    RESOLVED: ["CLOSED", "IN_PROGRESS"],
    CLOSED: [],
    REJECTED: [],
};

/**
 * Asserts that a status transition is valid according to the state machine.
 * Throws AppError(400) on illegal transitions.
 */
export function assertValidTransition(from: ComplaintStatus, to: ComplaintStatus): void {
    if (!VALID_TRANSITIONS[from].includes(to)) {
        throw new AppError(
            400,
            `Invalid transition: ${from} → ${to}`,
            "INVALID_TRANSITION"
        );
    }
}
