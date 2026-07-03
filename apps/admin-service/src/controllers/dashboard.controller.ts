import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";
import { getSummary } from "../services/dashboard.service";

export async function getDashboardSummaryHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const adminUserId = req.headers["x-user-id"] as string | undefined;
        if (!adminUserId) {
            throw new AppError(400, "Missing x-user-id header", "MISSING_USER_ID");
        }

        const summary = await getSummary(adminUserId, req.traceId ?? "dashboard-trace");
        res.status(200).json(summary);
    } catch (error) {
        next(error);
    }
}
