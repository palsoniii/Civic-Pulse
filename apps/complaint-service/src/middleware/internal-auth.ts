import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";

/**
 * Blocks any request that does not carry the X-Internal-Service header.
 * The API Gateway injects this header for all authenticated & proxied requests.
 * Its absence means the request came from outside the service mesh directly.
 */
export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers["x-internal-service"];
    if (!header) {
        return next(new AppError(403, "Forbidden: internal endpoint", "INTERNAL_ONLY"));
    }
    next();
}
