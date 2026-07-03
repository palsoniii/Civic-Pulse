FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/gateway/package.json ./apps/gateway/

RUN npm ci

COPY apps/gateway/ ./apps/gateway/

RUN npm run build --workspace=packages/shared-types \
    && npm run build --workspace=packages/shared-middleware \
    && npm run build --workspace=packages/shared-redis \
    && npm run build --workspace=apps/gateway

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/gateway ./apps/gateway

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ready || exit 1

CMD ["node", "apps/gateway/dist/server.js"]
