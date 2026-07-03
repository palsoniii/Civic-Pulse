import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "@civicpulse/shared-middleware";
import { CreateComplaintSchema } from "@civicpulse/shared-types";
import { ComplaintStatus, Category } from "@prisma/client";
import {
    createComplaint,
    listComplaints,
    getMyComplaints,
    getComplaintById,
    changeStatus,
} from "../services/complaint.service";
import {
    getCachedDetail,
    setCachedDetail,
    getCachedList,
    setCachedList,
    buildListCacheKey,
    invalidateDetail,
    invalidateListKeys,
} from "../cache/complaint.cache";

// ─────────────────────────────────────────────
// POST /api/v1/complaints
// ─────────────────────────────────────────────

export async function createComplaintHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const reporterId = req.headers["x-user-id"] as string | undefined;
        if (!reporterId) {
            return next(new AppError(400, "Missing x-user-id header", "MISSING_USER_ID"));
        }

        const body = CreateComplaintSchema.parse(req.body);
        const lat = body.location?.lat ?? body.lat;
        const lng = body.location?.lng ?? body.lng;

        if (typeof lat !== "number" || typeof lng !== "number") {
            return next(new AppError(400, "Location is required", "VALIDATION_ERROR"));
        }

        const complaint = await createComplaint(
            {
                category: body.category as Category,
                description: body.description,
                lat,
                lng,
                priority: body.priority,
            },
            reporterId
        );

        res.status(201).json(complaint);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// GET /api/v1/complaints
// ─────────────────────────────────────────────

export async function listComplaintsHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const status = req.query["status"] as ComplaintStatus | undefined;
        const category = req.query["category"] as Category | undefined;
        const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1", 10) || 1);
        const limit = Math.min(100, parseInt((req.query["limit"] as string) ?? "20", 10) || 20);

        const cacheKey = buildListCacheKey(status, category, page);
        const cached = await getCachedList(cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }

        const result = await listComplaints({ category, status, page, limit });
        await setCachedList(cacheKey, result);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// GET /api/v1/complaints/my
// ─────────────────────────────────────────────

export async function getMyComplaintsHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const reporterId = req.headers["x-user-id"] as string | undefined;
        if (!reporterId) {
            return next(new AppError(400, "Missing x-user-id header", "MISSING_USER_ID"));
        }

        const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1", 10) || 1);
        const limit = Math.min(100, parseInt((req.query["limit"] as string) ?? "20", 10) || 20);

        const result = await getMyComplaints(reporterId, page, limit);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// GET /api/v1/complaints/:id
// ─────────────────────────────────────────────

export async function getComplaintByIdHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id } = req.params;

        // Cache-first
        const cached = await getCachedDetail(id);
        if (cached) {
            res.status(200).json(cached);
            return;
        }

        const complaint = await getComplaintById(id);
        if (!complaint) {
            return next(new AppError(404, "Complaint not found", "COMPLAINT_NOT_FOUND"));
        }

        await setCachedDetail(id, complaint);
        res.status(200).json(complaint);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// PATCH /api/v1/complaints/:id/status
// ─────────────────────────────────────────────

const PatchStatusBody = z.object({
    status: z.nativeEnum(ComplaintStatus),
    reason: z.string().optional(),
});

export async function changeStatusHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id } = req.params;
        const changedBy = (req.headers["x-user-id"] as string | undefined) ?? "unknown";

        const body = PatchStatusBody.parse(req.body);
        const updated = await changeStatus(id, body, changedBy);

        if (!updated) {
            return next(new AppError(404, "Complaint not found", "COMPLAINT_NOT_FOUND"));
        }

        // Invalidate stale cache entries
        await Promise.all([
            invalidateDetail(id),
            invalidateListKeys(),
        ]);

        res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
}
