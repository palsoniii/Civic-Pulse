import axios from "axios";
import type { Assignment } from "@prisma/client";
import { AppError } from "@civicpulse/shared-middleware";
import { prisma } from "../prisma/client";
import { publishComplaintAssigned } from "../events/publishers";

export interface ComplaintDetails {
    id: string;
    reporterId: string;
    category: string;
    priority: string;
    status: string;
}

export interface AssignmentListItem {
    id: string;
    complaintId: string;
    departmentId: string;
    department: {
        name: string;
    };
    assignedAt: Date;
}

export async function fetchComplaintDetails(
    complaintId: string,
    adminUserId: string,
    traceId: string
): Promise<ComplaintDetails> {
    try {
        const response = await axios.get(
            `${process.env.COMPLAINT_SERVICE_URL}/api/v1/complaints/${complaintId}`,
            {
                headers: {
                    "x-internal-service": "admin-service",
                    "x-user-id": adminUserId,
                    "x-user-role": "ADMIN",
                    "x-trace-id": traceId,
                },
                timeout: 5000,
            }
        );

        return {
            id: response.data.id,
            reporterId: response.data.reporterId,
            category: response.data.category,
            priority: response.data.priority,
            status: response.data.status,
        };
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw new AppError(404, "Complaint not found", "COMPLAINT_NOT_FOUND");
        }

        if (axios.isAxiosError(error) && !error.response) {
            throw new AppError(502, "Complaint service unavailable", "SERVICE_UNAVAILABLE");
        }

        if (axios.isAxiosError(error)) {
            throw new AppError(
                error.response?.status ?? 502,
                "Failed to validate complaint",
                "COMPLAINT_LOOKUP_FAILED"
            );
        }

        throw error;
    }
}

export async function assignComplaint(
    complaintId: string,
    departmentId: string,
    adminUserId: string,
    traceId: string
): Promise<Assignment> {
    const complaint = await fetchComplaintDetails(complaintId, adminUserId, traceId);

    const department = await prisma.department.findUnique({
        where: { id: departmentId },
    });

    if (!department) {
        throw new AppError(404, "Department not found", "DEPARTMENT_NOT_FOUND");
    }

    const assignment = await prisma.assignment.create({
        data: {
            complaintId,
            departmentId,
            assignedBy: adminUserId,
        },
    });

    await publishComplaintAssigned({
        complaint_id: complaintId,
        department_id: departmentId,
        assigned_by: adminUserId,
        reporter_id: complaint.reporterId,
    });

    return assignment;
}

export async function listAssignments(): Promise<AssignmentListItem[]> {
    return prisma.assignment.findMany({
        orderBy: { assignedAt: "desc" },
        include: {
            department: {
                select: {
                    name: true,
                },
            },
        },
    });
}
