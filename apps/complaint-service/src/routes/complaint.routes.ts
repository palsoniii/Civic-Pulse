import { Router } from "express";
import { internalAuth } from "../middleware/internal-auth";
import {
    createComplaintHandler,
    listComplaintsHandler,
    getMyComplaintsHandler,
    getComplaintByIdHandler,
    changeStatusHandler,
} from "../controllers/complaint.controller";
import { getHistoryHandler } from "../controllers/history.controller";

const router = Router();

// All complaint routes require the x-internal-service header
router.use(internalAuth);

// ── List / Create ──────────────────────────────────────────────────────────
router.post("/", createComplaintHandler);
router.get("/", listComplaintsHandler);

// ── User-specific ──────────────────────────────────────────────────────────
// NOTE: /my MUST be registered before /:id to avoid "my" being matched as an id
router.get("/my", getMyComplaintsHandler);

// ── Single complaint ───────────────────────────────────────────────────────
router.get("/:id", getComplaintByIdHandler);
router.patch("/:id/status", changeStatusHandler);
router.get("/:id/history", getHistoryHandler);

export default router;
