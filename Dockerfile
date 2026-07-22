# syntax=docker/dockerfile:1

# ---- deps (all) ----
FROM docker.io/oven/bun:1.3.14-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/a11y-testing/package.json ./packages/a11y-testing/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN bun install --frozen-lockfile

# ---- build ----
FROM docker.io/oven/bun:1.3.14-alpine AS builder
WORKDIR /app

# Bun's isolated workspace linker places resolution symlinks beside each
# workspace manifest, so preserve the complete installed workspace layout.
COPY --from=deps /app ./
COPY . .

RUN cd apps/web && bun run build

# ---- deps (production only) ----
FROM docker.io/oven/bun:1.3.14-alpine AS prod-deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/a11y-testing/package.json ./packages/a11y-testing/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN bun install --frozen-lockfile --production

# ---- runtime ----
FROM docker.io/oven/bun:1.3.14-alpine AS runner
WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV PORT=3000

# Minimal HTTP client for HEALTHCHECK probes
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup -S app && adduser -S app -G app

COPY --chown=app:app --from=prod-deps /app/node_modules /app/node_modules
COPY --chown=app:app --from=prod-deps /app/apps/web/node_modules ./node_modules
# The @punktlandung/ui workspace link must resolve at runtime.
COPY --chown=app:app --from=builder /app/packages/ui /app/packages/ui
COPY --chown=app:app --from=builder /app/apps/web/dist ./dist
COPY --chown=app:app --from=builder /app/apps/web/scripts ./scripts
COPY --chown=app:app --from=builder /app/apps/web/package.json ./package.json
# Migration inputs: the deploy host runs `bunx --bun drizzle-kit migrate`
# in this image as a oneshot before starting the server.
COPY --chown=app:app --from=builder /app/apps/web/drizzle ./drizzle
COPY --chown=app:app --from=builder /app/apps/web/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD curl -fsS "http://127.0.0.1:${PORT}/api/healthz" >/dev/null || exit 1

USER app

CMD ["bun", "run", "start"]
