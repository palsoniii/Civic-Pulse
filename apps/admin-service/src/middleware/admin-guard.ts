import { Request, Response, NextFunction } from "express";
import { AppError } from "@civicpulse/shared-middleware";

export function adminGuard(req: Request, _res: Response, next: NextFunction): void {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
        next(new AppError(403, "Admin access required", "FORBIDDEN"));
        return;
    }
    next();
}
