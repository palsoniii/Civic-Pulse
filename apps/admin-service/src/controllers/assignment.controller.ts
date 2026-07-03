import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "@civicpulse/shared-middleware";
import { assignComplaint, listAssignments } from "../services/assignment.service";

const AssignComplaintSchema = z.object({
    departmentId: z.string().uuid(),
});

export async function assignComplaintHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const adminUserId = req.headers["x-user-id"] as string | undefined;
        if (!adminUserId) {
            throw new AppError(400, "Missing x-user-id header", "MISSING_USER_ID");
        }

        const body = AssignComplaintSchema.parse(req.body);
        const traceId = req.traceId ?? "admin-trace";
        const assignment = await assignComplaint(req.params.id, body.departmentId, adminUserId, traceId);

        res.status(200).json({
            message: "Complaint assigned successfully",
            assignment,
        });
    } catch (error) {
        next(error);
    }
}

export async function listAssignmentsHandler(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const assignments = await listAssignments();
        res.status(200).json(assignments);
    } catch (error) {
        next(error);
    }
}
