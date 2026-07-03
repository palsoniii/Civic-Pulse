import axios from "axios";
import { createRedisClient } from "@civicpulse/shared-redis";
import { prisma } from "../prisma/client";

export interface DashboardSummary {
    open: number;
    in_progress: number;
    resolved: number;
    departments: number;
}

async function fetchComplaintCount(
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED",
    adminUserId: string,
    traceId: string
): Promise<number> {
    const response = await axios.get(`${process.env.COMPLAINT_SERVICE_URL}/api/v1/complaints`, {
        headers: {
            "x-internal-service": "admin-service",
            "x-user-id": adminUserId,
            "x-user-role": "ADMIN",
            "x-trace-id": traceId,
        },
        params: {
            status,
            limit: 1,
            page: 1,
        },
        timeout: 5000,
    });

    return Number(response.data.total ?? 0);
}

export async function getSummary(adminUserId: string, traceId: string): Promise<DashboardSummary> {
    const redis = createRedisClient();
    const cacheKey = "admin:dashboard:summary";
    const cached = await redis.get(cacheKey);

    if (cached) {
        return JSON.parse(cached) as DashboardSummary;
    }

    const [open, inProgress, resolved, departments] = await Promise.all([
        fetchComplaintCount("OPEN", adminUserId, traceId),
        fetchComplaintCount("IN_PROGRESS", adminUserId, traceId),
        fetchComplaintCount("RESOLVED", adminUserId, traceId),
        prisma.department.count(),
    ]);

    const summary: DashboardSummary = {
        open,
        in_progress: inProgress,
        resolved,
        departments,
    };

    await redis.set(cacheKey, JSON.stringify(summary), "EX", 60);

    return summary;
}
