FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/notification-service/package.json ./apps/notification-service/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-middleware/package.json ./packages/shared-middleware/
COPY packages/shared-redis/package.json ./packages/shared-redis/

RUN npm ci

COPY packages/ ./packages/
COPY apps/notification-service/ ./apps/notification-service/

RUN npm run build --workspace=packages/shared-types \
    && npm run build --workspace=packages/shared-middleware \
    && npm run build --workspace=packages/shared-redis

RUN npx prisma generate --schema=apps/notification-service/prisma/schema.prisma
RUN npm run build --workspace=apps/notification-service

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=builder /app/apps/notification-service/package.json ./apps/notification-service/
COPY --from=builder /app/apps/notification-service/prisma ./apps/notification-service/prisma

RUN npx prisma generate --schema=apps/notification-service/prisma/schema.prisma

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3004/health || exit 1

CMD ["node", "apps/notification-service/dist/server.js"]
