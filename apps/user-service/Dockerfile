# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo manifests (workspace awareness)
COPY package.json package-lock.json turbo.json ./
COPY apps/user-service/package.json ./apps/user-service/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-middleware/package.json ./packages/shared-middleware/
COPY packages/shared-redis/package.json ./packages/shared-redis/

# Install ALL workspace deps
RUN npm ci

# Copy source
COPY packages/ ./packages/
COPY apps/user-service/ ./apps/user-service/

# Build shared packages first
RUN npm run build --workspace=packages/shared-types \
 && npm run build --workspace=packages/shared-middleware \
 && npm run build --workspace=packages/shared-redis

# Generate Prisma client
RUN npx prisma generate --schema=apps/user-service/prisma/schema.prisma

# Build user-service
RUN npm run build --workspace=apps/user-service


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Only copy what's needed for production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/user-service/dist ./apps/user-service/dist
COPY --from=builder /app/apps/user-service/package.json ./apps/user-service/
COPY --from=builder /app/apps/user-service/prisma ./apps/user-service/prisma

# Regenerate Prisma client in runtime image (binary matters per Alpine)
RUN npx prisma generate --schema=apps/user-service/prisma/schema.prisma

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/users/ready || exit 1

CMD ["node", "apps/user-service/dist/server.js"]
