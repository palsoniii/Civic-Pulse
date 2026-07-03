import { v4 as uuid } from "uuid";
import { prisma } from "../prisma/client";
import { assertValidTransition } from "./status.service";
import { buildEvent } from "../events/publishers";
import { ComplaintStatus, Category, Priority } from "@prisma/client";
import type {
    ComplaintCreatedPayload,
    StatusChangedPayload,
} from "@civicpulse/shared-types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateComplaintInput {
    category: Category;
    description: string;
    lat: number;
    lng: number;
    priority?: Priority;
}

export interface ListComplaintsInput {
    category?: Category;
    status?: ComplaintStatus;
    page: number;
    limit: number;
}

export interface ChangeStatusInput {
    status: ComplaintStatus;
    reason?: string;
}

// ─────────────────────────────────────────────
// createComplaint
// ─────────────────────────────────────────────

export async function createComplaint(data: CreateComplaintInput, reporterId: string) {
    return prisma.$transaction(async (tx) => {
        const complaint = await tx.complaint.create({
            data: {
                reporterId,
                category: data.category,
                description: data.description,
                lat: data.lat,
                lng: data.lng,
                priority: data.priority ?? Priority.MEDIUM,
            },
        });

        const eventPayload: ComplaintCreatedPayload = {
            complaint_id: complaint.id,
            reporter_id: complaint.reporterId,
            category: complaint.category,
            description: complaint.description,
            lat: complaint.lat,
            lng: complaint.lng,
            priority: complaint.priority,
            status: complaint.status,
        };

        const event = buildEvent("complaint.created", eventPayload as unknown as Record<string, unknown>);

        await tx.outbox.create({
            data: {
                complaintId: complaint.id,
                eventType: "complaint.created",
                payload: JSON.stringify(event),
                published: false,
            },
        });

        return complaint;
    });
}

// ─────────────────────────────────────────────
// listComplaints
// ─────────────────────────────────────────────

export async function listComplaints(input: ListComplaintsInput) {
    const { category, status, page, limit } = input;
    const skip = (page - 1) * limit;

    const where = {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
    };

    const [data, total] = await Promise.all([
        prisma.complaint.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.complaint.count({ where }),
    ]);

    return { data, total, page, limit };
}

// ─────────────────────────────────────────────
// getMyComplaints
// ─────────────────────────────────────────────

export async function getMyComplaints(reporterId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        prisma.complaint.findMany({
            where: { reporterId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.complaint.count({ where: { reporterId } }),
    ]);

    return { data, total, page, limit };
}

// ─────────────────────────────────────────────
// getComplaintById
// ─────────────────────────────────────────────

export async function getComplaintById(id: string) {
    return prisma.complaint.findUnique({
        where: { id },
        include: {
            history: { orderBy: { changedAt: "asc" } },
            mediaRefs: true,
        },
    });
}

// ─────────────────────────────────────────────
// changeStatus
// ─────────────────────────────────────────────

export async function changeStatus(
    id: string,
    input: ChangeStatusInput,
    changedBy: string
) {
    return prisma.$transaction(async (tx) => {
        // 1. Load current complaint
        const complaint = await tx.complaint.findUnique({ where: { id } });
        if (!complaint) return null;

        // 2. Guard: validate transition
        assertValidTransition(complaint.status, input.status);

        // 3. Update status
        const updated = await tx.complaint.update({
            where: { id },
            data: { status: input.status },
            include: {
                history: { orderBy: { changedAt: "asc" } },
                mediaRefs: true,
            },
        });

        // 4. Append StatusHistory row (in same transaction)
        await tx.statusHistory.create({
            data: {
                complaintId: id,
                fromStatus: complaint.status,
                toStatus: input.status,
                changedBy,
                reason: input.reason,
            },
        });

        // 5. Write Outbox event
        const eventPayload: StatusChangedPayload = {
            complaint_id: id,
            reporter_id: complaint.reporterId,
            from_status: complaint.status,
            to_status: input.status,
            changed_by: changedBy,
            reason: input.reason,
        };

        const event = buildEvent(
            "complaint.status_changed",
            eventPayload as unknown as Record<string, unknown>
        );

        await tx.outbox.create({
            data: {
                complaintId: id,
                eventType: "complaint.status_changed",
                payload: JSON.stringify(event),
                published: false,
            },
        });

        return updated;
    });
}

// ─────────────────────────────────────────────
// getComplaintHistory
// ─────────────────────────────────────────────

export async function getComplaintHistory(complaintId: string) {
    return prisma.statusHistory.findMany({
        where: { complaintId },
        orderBy: { changedAt: "asc" },
    });
}
