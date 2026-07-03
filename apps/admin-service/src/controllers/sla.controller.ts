import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";
import { getSlaViolations } from "../services/sla.service";

export async function getSlaViolationsHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const adminUserId = req.headers["x-user-id"] as string | undefined;
        if (!adminUserId) {
            throw new AppError(400, "Missing x-user-id header", "MISSING_USER_ID");
        }

        const violations = await getSlaViolations(adminUserId, req.traceId ?? "sla-trace");
        res.status(200).json(violations);
    } catch (error) {
        next(error);
    }
}
