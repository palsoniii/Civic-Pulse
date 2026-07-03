import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const repoRoot = path.resolve(__dirname, "../../..");
const demoIdsPath = path.join(repoRoot, "scripts", "seed-data", "sla-demo-ids.json");

const departments = [
    {
        name: "Roads & Infrastructure Department",
        zone: "City-Wide",
        contactEmail: "roads@civicpulse.local",
    },
    {
        name: "Water Supply & Sewage Department",
        zone: "City-Wide",
        contactEmail: "water@civicpulse.local",
    },
    {
        name: "Electricity & Street Lighting",
        zone: "City-Wide",
        contactEmail: "electricity@civicpulse.local",
    },
    {
        name: "Solid Waste & Garbage Management - North Zone",
        zone: "North Zone",
        contactEmail: "garbage.north@civicpulse.local",
    },
    {
        name: "Solid Waste & Garbage Management - South Zone",
        zone: "South Zone",
        contactEmail: "garbage.south@civicpulse.local",
    },
    {
        name: "Parks & Public Spaces",
        zone: "City-Wide",
        contactEmail: "parks@civicpulse.local",
    },
    {
        name: "Emergency Response Unit",
        zone: "City-Wide",
        contactEmail: "emergency@civicpulse.local",
    },
] as const;

interface DemoComplaintIds {
    pothole: string;
    waterLeak: string;
    streetlight: string;
    garbage: string;
}

function loadDemoComplaintIds(): DemoComplaintIds {
    const parsed = JSON.parse(fs.readFileSync(demoIdsPath, "utf8")) as DemoComplaintIds;
    return parsed;
}

const seededAssignmentsTemplate = [
    {
        id: "seed-assign-sla-pothole",
        key: "pothole",
        departmentName: "Roads & Infrastructure Department",
        assignedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
    {
        id: "seed-assign-sla-water-leak",
        key: "waterLeak",
        departmentName: "Water Supply & Sewage Department",
        assignedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
        id: "seed-assign-sla-streetlight",
        key: "streetlight",
        departmentName: "Electricity & Street Lighting",
        assignedAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
    },
    {
        id: "seed-assign-sla-garbage",
        key: "garbage",
        departmentName: "Solid Waste & Garbage Management - North Zone",
        assignedAt: new Date(Date.now() - 130 * 60 * 60 * 1000),
    },
] as const;

async function main(): Promise<void> {
    const demoComplaintIds = loadDemoComplaintIds();
    const seededAssignments = seededAssignmentsTemplate.map((assignment) => ({
        ...assignment,
        complaintId: demoComplaintIds[assignment.key],
    }));
    const rules = [
        { category: "POTHOLE", priority: "HIGH", resolutionHours: 24 },
        { category: "POTHOLE", priority: "CRITICAL", resolutionHours: 8 },
        { category: "WATER_LEAK", priority: "CRITICAL", resolutionHours: 4 },
        { category: "WATER_LEAK", priority: "HIGH", resolutionHours: 12 },
        { category: "STREETLIGHT", priority: "MEDIUM", resolutionHours: 72 },
        { category: "GARBAGE", priority: "LOW", resolutionHours: 120 },
    ] as const;

    for (const rule of rules) {
        await prisma.slaRule.upsert({
            where: {
                category_priority: {
                    category: rule.category,
                    priority: rule.priority,
                },
            },
            update: {},
            create: rule,
        });
    }

    await prisma.assignment.deleteMany({
        where: {
            OR: [
                {
                    id: {
                        in: seededAssignments.map((assignment) => assignment.id),
                    },
                },
                {
                    complaintId: {
                        in: [
                            "seed-sla-pothole",
                            "seed-sla-water-leak",
                            "seed-sla-streetlight",
                            "seed-sla-garbage",
                        ],
                    },
                },
                {
                    department: {
                        name: {
                            startsWith: "Operations",
                        },
                    },
                },
            ],
        },
    });

    await prisma.assignment.deleteMany({
        where: {
            OR: [
                {
                    complaintId: {
                        in: seededAssignments.map((assignment) => assignment.complaintId),
                    },
                },
                {
                    department: {
                        name: {
                            startsWith: "Ops ",
                        },
                    },
                },
            ],
        },
    });

    await prisma.department.deleteMany({
        where: {
            OR: [
                {
                    name: {
                        startsWith: "Operations",
                    },
                },
                {
                    name: {
                        startsWith: "Ops ",
                    },
                },
            ],
        },
    });

    const seededDepartmentByName = new Map<string, { id: string }>();

    for (const department of departments) {
        const record = await prisma.department.upsert({
            where: {
                name: department.name,
            },
            update: {
                zone: department.zone,
                contactEmail: department.contactEmail,
            },
            create: department,
        });

        seededDepartmentByName.set(department.name, { id: record.id });
    }

    for (const assignment of seededAssignments) {
        const department = seededDepartmentByName.get(assignment.departmentName);

        if (!department) {
            throw new Error(`Missing seeded department: ${assignment.departmentName}`);
        }

        await prisma.assignment.upsert({
            where: {
                id: assignment.id,
            },
            update: {
                complaintId: assignment.complaintId,
                departmentId: department.id,
                assignedBy: "seed-system",
                assignedAt: assignment.assignedAt,
            },
            create: {
                id: assignment.id,
                complaintId: assignment.complaintId,
                departmentId: department.id,
                assignedBy: "seed-system",
                assignedAt: assignment.assignedAt,
            },
        });
    }

    console.info("[admin-service] SLA rules, departments, and demo assignments seeded");
}

main()
    .catch((error) => {
        console.error("[admin-service] Failed to seed SLA rules", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
