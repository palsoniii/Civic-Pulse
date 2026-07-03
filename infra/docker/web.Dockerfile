FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/

RUN npm ci

COPY apps/web/ ./apps/web/

# Build the Vite app (outputs to apps/web/dist)
RUN npm run build --workspace=apps/web

FROM node:20-alpine AS runtime

WORKDIR /app

# Install a lightweight static server
RUN npm install -g serve

COPY --from=builder /app/apps/web/dist /app/dist

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5173/ || exit 1

CMD ["serve", "-s", "/app/dist", "-l", "5173"]
