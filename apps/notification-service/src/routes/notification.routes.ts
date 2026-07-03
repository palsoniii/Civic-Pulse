import { Router } from "express";
import { internalAuth } from "../middleware/internal-auth";
import {
    getMyNotificationsHandler,
    markNotificationReadHandler,
    getPreferencesHandler,
    updatePreferencesHandler,
} from "../controllers/notification.controller";

const router = Router();

router.use(internalAuth);

router.get("/me", getMyNotificationsHandler);
router.patch("/:id/read", markNotificationReadHandler);
router.get("/preferences", getPreferencesHandler);
router.patch("/preferences", updatePreferencesHandler);

export default router;
