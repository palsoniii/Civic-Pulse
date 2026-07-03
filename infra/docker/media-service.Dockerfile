FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/media-service/package.json ./apps/media-service/

RUN npm ci

COPY apps/media-service/ ./apps/media-service/

RUN npm run build --workspace=packages/shared-types \
    && npm run build --workspace=packages/shared-middleware \
    && npm run build --workspace=packages/shared-redis \
    && npm run build --workspace=apps/media-service

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/media-service ./apps/media-service

EXPOSE 3005

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3005/api/v1/media/ready || exit 1

CMD ["node", "apps/media-service/dist/server.js"]
