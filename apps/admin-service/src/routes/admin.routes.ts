import { Router } from "express";
import { internalAuth } from "../middleware/internal-auth";
import { adminGuard } from "../middleware/admin-guard";
import { createDepartmentHandler, listDepartmentsHandler } from "../controllers/department.controller";
import { assignComplaintHandler, listAssignmentsHandler } from "../controllers/assignment.controller";
import { getDashboardSummaryHandler } from "../controllers/dashboard.controller";
import { getSlaViolationsHandler } from "../controllers/sla.controller";

const router = Router();

router.use(internalAuth);
router.use(adminGuard);

router.post("/departments", createDepartmentHandler);
router.get("/departments", listDepartmentsHandler);
router.get("/assignments", listAssignmentsHandler);
router.post("/complaints/:id/assign", assignComplaintHandler);
router.get("/dashboard/summary", getDashboardSummaryHandler);
router.get("/sla/violations", getSlaViolationsHandler);

export default router;
