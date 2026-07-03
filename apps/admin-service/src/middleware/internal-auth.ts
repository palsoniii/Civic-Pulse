import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";

export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers["x-internal-service"];
    if (!header) {
        next(new AppError(403, "Forbidden: internal endpoint", "INTERNAL_ONLY"));
        return;
    }
    next();
}
