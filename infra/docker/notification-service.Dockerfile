FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/notification-service/package.json ./apps/notification-service/

RUN npm ci

COPY apps/notification-service/ ./apps/notification-service/

RUN npm run build --workspace=packages/shared-types \
    && npm run build --workspace=packages/shared-middleware \
    && npm run build --workspace=packages/shared-redis \
    && ./node_modules/.bin/prisma generate --schema=./apps/notification-service/prisma/schema.prisma \
    && npm run build --workspace=apps/notification-service

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/notification-service ./apps/notification-service

EXPOSE 3004

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3004/api/v1/notifications/ready || exit 1

CMD ["node", "apps/notification-service/dist/server.js"]
