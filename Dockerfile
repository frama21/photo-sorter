# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — Build the static site with pnpm
# (this whole stage is thrown away; only its dist/ output ships)
# ============================================================
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

# ============================================================
# Stage 2 — Serve the static files with a tiny nginx
# Final image = nginx:alpine (~thin) + the built assets only.
# ============================================================
FROM nginx:1.27-alpine AS runtime

# SPA routing, security headers, caching and PWA/WASM MIME types.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf

# Only the compiled static output is copied into the runtime image.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic self-check that nginx is serving.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
