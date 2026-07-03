import { prisma } from "../prisma/client";
import { fetchComplaintDetails } from "./assignment.service";

export interface SlaViolation {
    complaintId: string;
    departmentId: string;
    assignedAt: Date;
    resolutionHours: number;
    hoursOverdue: number;
}

export async function getSlaViolations(adminUserId: string, traceId: string): Promise<SlaViolation[]> {
    const [rules, assignments] = await Promise.all([
        prisma.slaRule.findMany(),
        prisma.assignment.findMany({
            orderBy: { assignedAt: "desc" },
        }),
    ]);

    const complaintCache = new Map<string, Awaited<ReturnType<typeof fetchComplaintDetails>>>();
    const violations: SlaViolation[] = [];

    for (const assignment of assignments) {
        let complaint = complaintCache.get(assignment.complaintId);

        if (!complaint) {
            complaint = await fetchComplaintDetails(assignment.complaintId, adminUserId, traceId);
            complaintCache.set(assignment.complaintId, complaint);
        }

        if (complaint.status !== "IN_PROGRESS") {
            continue;
        }

        const rule = rules.find(
            (candidate) =>
                candidate.category === complaint.category && candidate.priority === complaint.priority
        );

        if (!rule) {
            continue;
        }

        const elapsedMs = Date.now() - assignment.assignedAt.getTime();
        const limitMs = rule.resolutionHours * 60 * 60 * 1000;

        if (elapsedMs <= limitMs) {
            continue;
        }

        violations.push({
            complaintId: assignment.complaintId,
            departmentId: assignment.departmentId,
            assignedAt: assignment.assignedAt,
            resolutionHours: rule.resolutionHours,
            hoursOverdue: Number(((elapsedMs - limitMs) / (60 * 60 * 1000)).toFixed(2)),
        });
    }

    return violations;
}
