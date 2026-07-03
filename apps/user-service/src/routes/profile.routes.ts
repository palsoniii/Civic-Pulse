import { Router } from "express";
import { getProfileHandler, updateProfileHandler } from "../controllers/profile.controller";

const router = Router();

router.get("/:id/profile", getProfileHandler);
router.patch("/:id/profile", updateProfileHandler);

export default router;
