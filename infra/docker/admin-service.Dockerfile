FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/admin-service/package.json ./apps/admin-service/

RUN npm ci

COPY apps/admin-service/ ./apps/admin-service/

RUN npm run build --workspace=packages/shared-types \
    && npm run build --workspace=packages/shared-middleware \
    && npm run build --workspace=packages/shared-redis \
    && ./node_modules/.bin/prisma generate --schema=./apps/admin-service/prisma/schema.prisma \
    && npm run build --workspace=apps/admin-service

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/admin-service ./apps/admin-service

EXPOSE 3003

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3003/api/v1/admin/ready || exit 1

CMD ["node", "apps/admin-service/dist/server.js"]
