import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Role guard factory.
 * Must be placed AFTER authMiddleware (relies on x-user-role header being set).
 *
 * Usage: router.use(requireRole("ADMIN", "SUPERADMIN"))
 */
export function requireRole(...roles: string[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const userRole = req.headers["x-user-role"] as string | undefined;

        if (!userRole || !roles.includes(userRole)) {
            res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
            return;
        }

        next();
    };
}
