import { execFileSync } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const repoRoot = path.resolve(__dirname, "../../..");
const demoIdsPath = path.join(repoRoot, "scripts", "seed-data", "sla-demo-ids.json");

const seededComplaintTemplates = [
    {
        key: "pothole",
        category: "POTHOLE",
        priority: "HIGH",
        status: "IN_PROGRESS",
        description: "Large pothole on MG Road causing vehicle damage",
        lat: 19.076,
        lng: 72.877,
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
    {
        key: "waterLeak",
        category: "WATER_LEAK",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        description: "Burst water main flooding residential street near Sector 4",
        lat: 19.082,
        lng: 72.881,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
        key: "streetlight",
        category: "STREETLIGHT",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        description: "3 consecutive streetlights non-functional on Hill Road",
        lat: 19.071,
        lng: 72.869,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
    },
    {
        key: "garbage",
        category: "GARBAGE",
        priority: "LOW",
        status: "IN_PROGRESS",
        description: "Overflowing garbage bins outside community centre",
        lat: 19.065,
        lng: 72.862,
        createdAt: new Date(Date.now() - 130 * 60 * 60 * 1000),
    },
] as const;

interface DemoComplaintIds {
    pothole: string;
    waterLeak: string;
    streetlight: string;
    garbage: string;
}

function isUuid(value: string | undefined): value is string {
    return Boolean(
        value &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );
}

function loadDemoComplaintIds(): DemoComplaintIds {
    if (fs.existsSync(demoIdsPath)) {
        const parsed = JSON.parse(fs.readFileSync(demoIdsPath, "utf8")) as Partial<DemoComplaintIds>;
        if (
            isUuid(parsed.pothole) &&
            isUuid(parsed.waterLeak) &&
            isUuid(parsed.streetlight) &&
            isUuid(parsed.garbage)
        ) {
            return parsed as DemoComplaintIds;
        }
    }

    const generated: DemoComplaintIds = {
        pothole: randomUUID(),
        waterLeak: randomUUID(),
        streetlight: randomUUID(),
        garbage: randomUUID(),
    };

    fs.mkdirSync(path.dirname(demoIdsPath), { recursive: true });
    fs.writeFileSync(demoIdsPath, JSON.stringify(generated, null, 2));

    return generated;
}

function runUsersSql(sql: string): string {
    return execFileSync(
        "docker-compose",
        [
            "exec",
            "-T",
            "postgres-users",
            "psql",
            "-U",
            "civicpulse",
            "-d",
            "users_db",
            "-t",
            "-A",
            "-c",
            sql,
        ],
        {
            cwd: repoRoot,
            encoding: "utf8",
        }
    ).trim();
}

function resolveReporterId(): string {
    const existingCitizenId = runUsersSql(
        `SELECT id FROM "User" WHERE role = 'CITIZEN' ORDER BY "createdAt" ASC LIMIT 1;`
    );

    if (existingCitizenId) {
        return existingCitizenId;
    }

    const existingDemoId = runUsersSql(
        `SELECT id FROM "User" WHERE email = 'demo@civicpulse.local' LIMIT 1;`
    );

    if (existingDemoId) {
        return existingDemoId;
    }

    const insertedId = runUsersSql(`
        INSERT INTO "User" (id, email, "passwordHash", role, phone, "createdAt", "updatedAt")
        VALUES (
            '${randomUUID()}',
            'demo@civicpulse.local',
            'seeded-demo-password',
            'CITIZEN',
            NULL,
            NOW(),
            NOW()
        )
        RETURNING id;
    `);

    if (!insertedId) {
        throw new Error("Unable to create demo citizen reporter");
    }

    return insertedId;
}

async function main(): Promise<void> {
    const reporterId = resolveReporterId();
    const demoComplaintIds = loadDemoComplaintIds();
    const seededComplaints = seededComplaintTemplates.map((complaint) => ({
        ...complaint,
        id: demoComplaintIds[complaint.key],
    }));
    const legacyComplaintIds = [
        "seed-sla-pothole",
        "seed-sla-water-leak",
        "seed-sla-streetlight",
        "seed-sla-garbage",
    ];
    const allSeedComplaintIds = [...legacyComplaintIds, ...seededComplaints.map((complaint) => complaint.id)];
    const seededDescriptions = seededComplaints.map((complaint) => complaint.description);

    await prisma.statusHistory.deleteMany({
        where: {
            OR: [
                {
                    complaintId: {
                        in: allSeedComplaintIds,
                    },
                },
                {
                    complaint: {
                        description: {
                            in: seededDescriptions,
                        },
                    },
                },
            ],
        },
    });

    await prisma.assignment.deleteMany({
        where: {
            complaintId: {
                in: allSeedComplaintIds,
            },
        },
    });

    await prisma.mediaRef.deleteMany({
        where: {
            OR: [
                {
                    complaintId: {
                        in: allSeedComplaintIds,
                    },
                },
                {
                    complaint: {
                        description: {
                            in: seededDescriptions,
                        },
                    },
                },
            ],
        },
    });

    await prisma.outbox.deleteMany({
        where: {
            OR: [
                {
                    complaintId: {
                        in: allSeedComplaintIds,
                    },
                },
                {
                    complaint: {
                        description: {
                            in: seededDescriptions,
                        },
                    },
                },
            ],
        },
    });

    await prisma.complaint.deleteMany({
        where: {
            OR: [
                {
                    id: {
                        in: allSeedComplaintIds,
                    },
                },
                {
                    description: {
                        in: seededDescriptions,
                    },
                },
            ],
        },
    });

    for (const complaint of seededComplaints) {
        await prisma.complaint.create({
            data: {
                id: complaint.id,
                reporterId,
                category: complaint.category,
                priority: complaint.priority,
                status: complaint.status,
                description: complaint.description,
                lat: complaint.lat,
                lng: complaint.lng,
                createdAt: complaint.createdAt,
            },
        });

        await prisma.statusHistory.create({
            data: {
                id: randomUUID(),
                complaintId: complaint.id,
                fromStatus: "OPEN",
                toStatus: "IN_PROGRESS",
                changedBy: reporterId,
                reason: "Seeded demo SLA violation",
                changedAt: complaint.createdAt,
            },
        });
    }

    console.info(`[complaint-service] Seeded ${seededComplaints.length} demo SLA complaints for reporter ${reporterId}`);
}

main()
    .catch((error) => {
        console.error("[complaint-service] Failed to seed demo complaints", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
