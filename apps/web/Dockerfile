# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web/ ./apps/web/

# Build
WORKDIR /app/apps/web
RUN pnpm build

# ===== Stage 2: Production =====
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]
