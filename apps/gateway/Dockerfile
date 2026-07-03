# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo manifests (workspace awareness)
COPY package.json package-lock.json turbo.json ./
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-middleware/package.json ./packages/shared-middleware/
COPY packages/shared-redis/package.json ./packages/shared-redis/

# Install ALL workspace deps
RUN npm ci

# Copy source
COPY packages/ ./packages/
COPY apps/gateway/ ./apps/gateway/

# Build shared packages first
RUN npm run build --workspace=packages/shared-types \
 && npm run build --workspace=packages/shared-middleware \
 && npm run build --workspace=packages/shared-redis

# Build gateway
RUN npm run build --workspace=apps/gateway


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=builder /app/apps/gateway/package.json ./apps/gateway/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/gateway/dist/server.js"]
