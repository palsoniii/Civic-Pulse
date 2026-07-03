# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo manifests (workspace awareness)
COPY package.json package-lock.json turbo.json ./
COPY apps/complaint-service/package.json ./apps/complaint-service/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-middleware/package.json ./packages/shared-middleware/
COPY packages/shared-redis/package.json ./packages/shared-redis/

# Install all workspace deps
RUN npm ci

# Copy source
COPY packages/ ./packages/
COPY apps/complaint-service/ ./apps/complaint-service/

# Build shared packages first
RUN npm run build --workspace=packages/shared-types \
    && npm run build --workspace=packages/shared-middleware \
    && npm run build --workspace=packages/shared-redis

# Generate Prisma client
RUN npx prisma generate --schema=apps/complaint-service/prisma/schema.prisma

# Build complaint-service
RUN npm run build --workspace=apps/complaint-service


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/complaint-service/dist ./apps/complaint-service/dist
COPY --from=builder /app/apps/complaint-service/package.json ./apps/complaint-service/
COPY --from=builder /app/apps/complaint-service/prisma ./apps/complaint-service/prisma

# Regenerate Prisma client for the Alpine runtime binary
RUN npx prisma generate --schema=apps/complaint-service/prisma/schema.prisma

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "apps/complaint-service/dist/server.js"]
