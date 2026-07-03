import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";
import { getComplaintHistory } from "../services/complaint.service";

// ─────────────────────────────────────────────
// GET /api/v1/complaints/:id/history
// ─────────────────────────────────────────────

export async function getHistoryHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id } = req.params;
        const history = await getComplaintHistory(id);

        if (!history) {
            return next(new AppError(404, "Complaint not found", "COMPLAINT_NOT_FOUND"));
        }

        res.status(200).json(history);
    } catch (err) {
        next(err);
    }
}
