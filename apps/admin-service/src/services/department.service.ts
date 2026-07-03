import type { Department } from "@prisma/client";
import { AppError } from "@civicpulse/shared-middleware";
import { prisma } from "../prisma/client";

export interface CreateDepartmentInput {
    name: string;
    zone: string;
    contactEmail: string;
}

export async function createDepartment(data: CreateDepartmentInput): Promise<Department> {
    const existing = await prisma.department.findUnique({
        where: { name: data.name },
    });

    if (existing) {
        throw new AppError(409, "Department already exists", "DEPARTMENT_EXISTS");
    }

    return prisma.department.create({ data });
}

export async function listDepartments() {
    return prisma.department.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    assignments: true,
                },
            },
        },
    });
}
