# syntax=docker/dockerfile:1

# ============================================================
# Photo Sorter — production image
#
# Three stages:
#   1. build       — compile the SPA with pnpm (thrown away).
#   2. server-deps — install ONLY the runtime server deps (express/helmet).
#   3. runtime     — node:alpine running a tiny hardened static server as a
#                    non-root user. No nginx, no toolchain, no frontend deps.
# ============================================================

# ------------------------------------------------------------
# Stage 1 — Build the static site with pnpm
# ------------------------------------------------------------
FROM node:22-slim AS build

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

# Enable pnpm via corepack, pinned to the version used by the lockfile.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Install dependencies first so this layer is cached unless the lockfile changes.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# Build the production bundle (tsc -b && vite build → /app/dist).
COPY . .
RUN pnpm run build

# ------------------------------------------------------------
# Stage 2 — Install the runtime server's production dependencies only
# ------------------------------------------------------------
FROM node:22-alpine AS server-deps

WORKDIR /app
COPY server/package.json server/package-lock.json ./
# `npm ci` is fully reproducible from the committed lockfile.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ------------------------------------------------------------
# Stage 3 — Minimal runtime: static server + built assets only
# ------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# Runtime code + audited production node_modules + the compiled SPA.
COPY --chown=node:node server/index.js ./index.js
COPY --from=server-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./public

# Drop root — the process runs as the unprivileged built-in `node` user.
USER node

EXPOSE 8080

# Self-check the health endpoint using Node's built-in fetch (no curl/wget).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
