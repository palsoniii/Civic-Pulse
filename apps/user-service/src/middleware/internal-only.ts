import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";

/**
 * Blocks requests that do not carry the X-Internal-Service header.
 * Used to protect internal-only endpoints that should only be reachable
 * from within the service mesh / via the API gateway.
 */
export function internalOnly(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers["x-internal-service"];
    if (!header) {
        throw new AppError(403, "Forbidden: internal endpoint", "INTERNAL_ONLY");
    }
    next();
}
