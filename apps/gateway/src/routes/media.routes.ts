import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimitMiddleware } from "../middleware/ratelimit.middleware";
import { services } from "../config/services";
import { createServiceProxy } from "./proxy.utils";

const router = Router();

const proxy = createServiceProxy(services.media);

// All media routes require auth + rate limiting
router.use(authMiddleware, rateLimitMiddleware(), proxy);

export default router;
