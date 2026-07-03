import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimitMiddleware } from "../middleware/ratelimit.middleware";
import { requireRole } from "../middleware/roleGuard";
import { services } from "../config/services";
import { createServiceProxy } from "./proxy.utils";

const router = Router();

const proxy = createServiceProxy(services.admin);

// Admin routes: auth → role check (ADMIN | SUPERADMIN) → rate limit → proxy
router.use(
    authMiddleware,
    requireRole("ADMIN", "SUPERADMIN"),
    rateLimitMiddleware(),
    proxy
);

export default router;
