<div align="center">

# CivicPulse

**A microservices-based civic complaint and infrastructure resolution platform.**

CivicPulse models the full lifecycle of a municipal complaint system — citizens report civic issues (potholes, water leaks, streetlight failures), the platform routes them through department assignment, tracks SLA compliance, and notifies citizens as status changes. Built as five independently deployable Node.js services behind a single API gateway, with Redis Streams driving async workflows and per-service PostgreSQL databases enforcing domain isolation.

[![Node.js](https://img.shields.io/badge/Node.js-Express%204-339933?logo=node.js&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20%7C%20Prisma%205-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Streams-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-19%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Services](#running-the-services)
- [API Reference](#api-reference)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Problem Statement

Civic complaint handling in most municipalities is fragmented across phone calls, paper forms, or apps with no visibility into resolution status. CivicPulse addresses this with a structured pipeline:

- **Citizens** submit complaints with category, geolocation, and priority, and track status in real time.
- **Departments** receive assignments and are held against SLA rules keyed by category and priority.
- **Administrators** get a dashboard view of open/in-progress/resolved counts and active SLA violations.

The domain model enforces a strict complaint lifecycle state machine (`OPEN → IN_PROGRESS → RESOLVED → CLOSED`, with `REJECTED` as an early exit), and every transition is persisted to a status history table for auditability.

## Architecture

A single public entry point (the gateway) fronts five isolated backend services, each owning its own database. The gateway is the only trust boundary: it verifies the JWT, strips the raw `Authorization` header, and injects trusted internal headers (`x-user-id`, `x-user-role`, `x-internal-service`) before proxying — downstream services never see a raw token, they just check that the request came from the gateway.

```mermaid
flowchart LR
    Client(["Browser / API Client"]) --> GW["Gateway :3000\n(JWT verify, header injection)"]

    GW -->|"/api/v1/users\npublic: register/login/refresh"| US["user-service :3001"]
    GW -->|"/api/v1/complaints"| CS["complaint-service :3002"]
    GW -->|"/api/v1/admin\nADMIN / SUPERADMIN only"| AS["admin-service :3003"]
    GW -->|"/api/v1/notifications"| NS["notification-service :3004"]
    GW -->|"/api/v1/media\nstubbed — returns 501"| MS["media-service :3005"]

    US --> PGU[("postgres-users")]
    CS --> PGC[("postgres-complaints")]
    AS --> PGA[("postgres-admin")]
    NS --> PGN[("postgres-notifications")]
    MS -.->|"wired, not implemented"| MinIO[("MinIO")]
```

Async work is decoupled from the write path via Redis Streams, using a consumer-group model with idempotency keys and stale-message reclaim (`XAUTOCLAIM`). Complaint events are published through a transactional **outbox** table, so event delivery can never drift from what was actually committed to the database.

```mermaid
flowchart LR
    US2["user-service"] -->|"user.registered"| UE[("user:events")]
    CS2["complaint-service\n(outbox worker, polls 500ms)"] -->|"complaint.created\nstatus changed"| CE[("complaints:events")]
    AS2["admin-service"] -->|"complaint.assigned"| CE

    UE --> NSc["notification-service\n(notification-user-group)"]
    CE --> NSc2["notification-service\n(notification-group)"]

    ME[("media:events")] -. "media.uploaded\n(no producer yet — media-service is a stub)" .-> CSc["complaint-service\n(media-link-group)"]
```

**Key design decisions:**

| Decision | Why |
|---|---|
| Gateway strips raw `Authorization` header, injects trusted internal headers | Downstream services never see raw JWTs — trust boundary sits at the gateway |
| Outbox pattern for complaint events | Guarantees event publication is consistent with the DB write, not a separate fire-and-forget call |
| Redis-backed JWT ID revocation + hashed refresh token rotation | Access tokens are revocable server-side; refresh tokens are never stored in plaintext |
| Per-service database | No service can bypass another's domain boundary at the data layer |

## Database Design

Each service owns its schema outright — there are **no cross-database foreign keys**. Services that need to reference another service's entity (e.g. a complaint's `reporterId`, an assignment's `departmentId`) store the ID as a plain string and resolve it via API calls, not a DB-level join. This is the standard database-per-service trade-off: strong domain isolation in exchange for giving up referential integrity across boundaries.

<details>
<summary><strong>user-service</strong> — auth, sessions, notification preferences</summary>

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : has
    USER ||--|| USER_PREFERENCE : has

    USER {
        string id PK
        string email UK
        string passwordHash
        string role "CITIZEN | ADMIN | SUPERADMIN"
        string phone
        datetime createdAt
        datetime updatedAt
    }
    REFRESH_TOKEN {
        string id PK
        string tokenHash UK
        string userId FK
        datetime expiresAt
        boolean revoked
        string family
        datetime createdAt
    }
    USER_PREFERENCE {
        string userId PK
        boolean emailEnabled
        boolean smsEnabled
        boolean pushEnabled
    }
```
</details>

<details>
<summary><strong>complaint-service</strong> — complaint lifecycle, status history, outbox</summary>

```mermaid
erDiagram
    COMPLAINT ||--o{ STATUS_HISTORY : has
    COMPLAINT ||--o{ ASSIGNMENT : has
    COMPLAINT ||--o{ MEDIA_REF : has
    COMPLAINT ||--o{ OUTBOX : emits

    COMPLAINT {
        string id PK
        string reporterId "user-service User.id — no FK"
        string category "POTHOLE | GARBAGE | WATER_LEAK | STREETLIGHT | OTHER"
        string description
        float lat
        float lng
        string status "OPEN | IN_PROGRESS | RESOLVED | CLOSED | REJECTED"
        string priority "LOW | MEDIUM | HIGH | CRITICAL"
        datetime createdAt
        datetime updatedAt
    }
    STATUS_HISTORY {
        string id PK
        string complaintId FK
        string fromStatus
        string toStatus
        string changedBy
        string reason
        datetime changedAt
    }
    ASSIGNMENT {
        string id PK
        string complaintId FK
        string departmentId "admin-service Department.id — no FK"
        string assignedBy
        datetime assignedAt
    }
    MEDIA_REF {
        string id PK
        string complaintId FK
        string mediaUrl
        string thumbnailUrl
        string mediaType
    }
    OUTBOX {
        string id PK
        string eventType
        string payload "JSON string"
        boolean published
        datetime createdAt
        datetime publishedAt
    }
```
</details>

<details>
<summary><strong>admin-service</strong> — departments, staffing, assignment, SLA rules</summary>

```mermaid
erDiagram
    DEPARTMENT ||--o{ ADMIN_USER : staffed_by
    DEPARTMENT ||--o{ ASSIGNMENT : receives

    DEPARTMENT {
        string id PK
        string name UK
        string zone
        string contactEmail
        datetime createdAt
    }
    ADMIN_USER {
        string id PK
        string userId "user-service User.id — no FK"
        string departmentId FK
        string level "OFFICER | MANAGER | DIRECTOR"
    }
    ASSIGNMENT {
        string id PK
        string complaintId "complaint-service Complaint.id — no FK"
        string departmentId FK
        string assignedBy
        datetime assignedAt
    }
    SLA_RULE {
        string id PK
        string category
        string priority
        int resolutionHours
    }
```

Note: `Assignment` exists in **both** complaint-service and admin-service — each service keeps its own record of the same real-world fact for its own querying needs, correlated by `complaintId`/`departmentId` rather than a shared table.
</details>

<details>
<summary><strong>notification-service</strong> — notification log, delivery preferences</summary>

```mermaid
erDiagram
    NOTIFICATION_LOG {
        string id PK
        string userId "user-service User.id — no FK"
        string eventType
        string channel
        string payload
        string status
        string errorMessage
        datetime sentAt
        boolean read
    }
    NOTIFICATION_PREFERENCE {
        string userId PK "user-service User.id — no FK"
        boolean emailEnabled
        boolean smsEnabled
        boolean pushEnabled
    }
```
</details>

## Features

- **Auth** — register/login/refresh/logout, bcrypt password hashing, JWT access tokens with Redis-backed revocation, HTTP-only rotating refresh-token cookies, role-based access (`CITIZEN`, `ADMIN`, `SUPERADMIN`)
- **Complaints** — creation with geolocation, category, and priority; filtered/paginated listing; per-user history; state-machine-guarded status transitions; Redis-cached reads with invalidation on write
- **Admin** — department CRUD, complaint assignment (validated against complaint-service), dashboard summary, SLA violation detection by comparing assignment age to category/priority SLA rules
- **Notifications** — event-driven consumption of `user:events` and `complaints:events`, in-app notification log, email via `nodemailer` (Ethereal test accounts outside production), SMS as a console stub, per-user preference management
- **Media** — service scaffolded with health/readiness checks and MinIO wired in docker-compose; upload routes not yet implemented (see [Known Limitations](#known-limitations))
- **Frontend** — React + Vite SPA covering citizen and admin flows: login/register, complaint list/detail/form, admin dashboard, SLA violations view

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 5, TypeScript, React Router, TanStack Query, Zustand, Tailwind CSS |
| Backend | Node.js, Express 4, TypeScript, Zod |
| Data | PostgreSQL 15, Prisma 5 |
| Messaging / Cache | Redis 7, Redis Streams, ioredis |
| Auth | jsonwebtoken, bcrypt |
| Infra | Docker, Docker Compose, MinIO, Adminer |
| Monorepo | npm workspaces + Turborepo |

## Repository Structure

```text
apps/
  gateway/               API gateway — routing, auth enforcement, proxying
  user-service/          Auth, JWT/refresh-token handling, user profiles
  complaint-service/     Complaint lifecycle, status history, outbox
  admin-service/         Departments, assignment, dashboard, SLA detection
  notification-service/  Notification logs, preferences, stream consumers
  media-service/         Health/readiness only — routes stubbed
  web/                   Vite + React frontend

packages/
  shared-types/          Shared enums, Zod schemas, API/event contracts
  shared-middleware/     Logging, error handling, validation middleware
  shared-redis/          Redis client and stream helpers
  ui/                    Shared React UI components
  eslint-config/ typescript-config/   Shared tooling config

infra/docker/            Per-service Dockerfiles
scripts/                 Seed data, smoke tests
docker-compose.yml       Full local stack (Postgres x4, Redis, MinIO, Adminer, all services)
```

## Getting Started

### Prerequisites

- Node.js (npm `10.9.4`, per root `packageManager`)
- Docker + Docker Compose

### Setup

```bash
git clone https://github.com/palsoniii/Civic-Pulse.git
cd Civic-Pulse
npm install
docker compose up --build
```

This starts all four Postgres instances, Redis, MinIO, Adminer, all five backend services, the gateway, and the web app. Gateway on `:3000`, web on `:5173`, Adminer on `:8080`.

## Environment Variables

Each service reads its own `.env`; see the corresponding `.env.example` in each `apps/<service>` directory, or the root `.env.example` used by Docker Compose. Consolidated required variables:

| Service | Required | Notes |
|---|---|---|
| gateway | `REDIS_URL`, `JWT_SECRET` (≥16 chars), `USER_SERVICE_URL`, `COMPLAINT_SERVICE_URL`, `ADMIN_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `MEDIA_SERVICE_URL` | `PORT` defaults `3000`, `ALLOWED_ORIGINS` defaults `http://localhost:5173` |
| user-service | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (≥16 chars) | `JWT_EXPIRY` defaults `15m` |
| complaint-service | `DATABASE_URL`, `REDIS_URL` | `PORT` defaults `3002` |
| admin-service | `DATABASE_URL`, `REDIS_URL`, `COMPLAINT_SERVICE_URL` | `PORT` defaults `3003` |
| notification-service | `DATABASE_URL`, `REDIS_URL` | SMTP vars default to Ethereal test config |
| media-service | `REDIS_URL` | `PORT` defaults `3005` |

All services default `LOG_LEVEL=info` and `NODE_ENV=development` if unset.

## Running the Services

```bash
# Everything, via Turborepo
npm run dev

# One service
npm run dev --workspace=<workspace-name>

# Build / lint / test
npm run build
npm run lint
npm run test
npm run test:integration   # runs scripts/smoke-test.sh
```

Services with Prisma schemas (`user-service`, `complaint-service`, `admin-service`, `notification-service`) also expose:

```bash
npm run prisma:generate --workspace=<workspace-name>
npm run prisma:migrate --workspace=<workspace-name>
npm run db:seed --workspace=apps/admin-service       # and complaint-service
```

## API Reference

No OpenAPI/Swagger generation is currently wired in. Gateway route surface:

| Method | Path | Access |
|---|---|---|
| `GET` | `/health`, `/ready` | Gateway self-check |
| `*` | `/api/v1/users/*` | `register`/`login`/`refresh` public, rest authenticated |
| `*` | `/api/v1/complaints/*` | Authenticated |
| `*` | `/api/v1/admin/*` | `ADMIN` / `SUPERADMIN` only |
| `*` | `/api/v1/notifications/*` | Authenticated |
| `*` | `/api/v1/media/*` | Authenticated (stubbed — returns `501`) |

Full per-service route lists (individual endpoints for complaint status updates, department CRUD, SLA violation queries, notification preferences, etc.) are documented in each service's route files under `apps/<service>/src/routes`.

## Known Limitations

Being direct about this rather than leaving it implicit:

- **No automated test suite yet** — service `test` scripts are placeholders; `shared-types` runs lint as its test. Integration coverage exists only via `scripts/smoke-test.sh`, and CI only runs unit tests for `user-service`, `complaint-service`, and `shared-types`.
- **No OpenAPI/Swagger docs** — route contracts are readable from source but not machine-generated yet.
- **`media-service` is scaffolded, not implemented** — health/readiness endpoints work, upload routes return `501`, and the `media:events` stream has a consumer (complaint-service) but no producer yet.
- **SMS notifications are a stub** — `notification-service` logs the outgoing message to the console instead of calling a real provider (Twilio env vars are present but unused).

## License

This project is licensed under the [MIT License](LICENSE).
