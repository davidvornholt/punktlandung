# syntax=docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

# ---- deps (all) ----
FROM docker.io/oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/a11y-testing/package.json ./packages/a11y-testing/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN bun install --frozen-lockfile

# ---- build ----
FROM docker.io/oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS builder
WORKDIR /app

# Bun's isolated workspace linker places resolution symlinks beside each
# workspace manifest, so preserve the complete installed workspace layout.
COPY --from=deps /app ./
COPY . .

RUN cd apps/web && bun run build

# ---- deps (production only) ----
FROM docker.io/oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS prod-deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/a11y-testing/package.json ./packages/a11y-testing/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
# Runtime starts workspace scripts, whose public .bin links remain intact.
# Bun's isolated linker races when creating package-private cyclic .bin links;
# those installer-only links must not make the runtime artifact nondeterministic.
RUN bun install --frozen-lockfile --production \
    && find node_modules/.bun -path '*/node_modules/.bin' -type d -prune -exec rm -rf '{}' +

# ---- runtime ----
FROM docker.io/oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS runner
WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=bun:bun --from=prod-deps /app/node_modules /app/node_modules
COPY --chown=bun:bun --from=prod-deps /app/apps/web/node_modules ./node_modules
# The @punktlandung/ui workspace link must resolve at runtime.
COPY --chown=bun:bun --from=builder /app/packages/ui /app/packages/ui
COPY --chown=bun:bun --from=builder /app/apps/web/dist ./dist
COPY --chown=bun:bun --from=builder /app/apps/web/scripts ./scripts
COPY --chown=bun:bun --from=builder /app/apps/web/package.json ./package.json
# Migration inputs: the deploy host runs `bun run db:migrate:deploy`
# in this image as a oneshot before starting the server.
COPY --chown=bun:bun --from=builder /app/apps/web/drizzle ./drizzle
COPY --chown=bun:bun --from=builder /app/apps/web/src/shared/db ./src/shared/db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD bun -e 'const response = await fetch(`http://127.0.0.1:${process.env.PORT}/api/healthz`); process.exit(response.ok ? 0 : 1)'

USER bun

CMD ["bun", "run", "start"]
