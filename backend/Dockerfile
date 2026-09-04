# syntax=docker/dockerfile:1
#
# Backend production image (Phase 20).
#
# Two non-obvious requirements drive the shape of this file:
#   1. `sweph` (Swiss Ephemeris) is a NATIVE module, so the build stage needs
#      a toolchain. The slim runtime image gets the already-compiled
#      node_modules copied in rather than rebuilding.
#   2. PDF generation drives a real Chromium via puppeteer-core, which ships
#      no browser of its own — so the runtime image installs one and points
#      PUPPETEER_EXECUTABLE_PATH at it.
#
# Build from the REPOSITORY ROOT (npm workspaces need the root manifests):
#   docker build -f backend/Dockerfile -t jathakam-backend .

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:24-bookworm AS build
WORKDIR /app

# Manifests first so `npm ci` layer-caches independently of source changes.
# prisma/schema.prisma must be present before install: backend's postinstall
# runs `prisma generate`, which reads it.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma
COPY frontend/package.json ./frontend/

RUN npm ci

COPY backend ./backend
RUN npm run build --workspace backend

# npm workspaces hoist most packages to the root, so backend/node_modules
# may or may not exist depending on version conflicts. Guarantee it exists
# so the runtime COPY below can't fail on a hoisting difference.
RUN mkdir -p /app/backend/node_modules

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# chromium: required by puppeteer-core for PDF generation (spec §40).
# fonts-noto-core + fonts-noto-extra give Chromium a sane fallback for
# non-Latin text; the report itself embeds Noto Sans Tamil as base64, so
# Tamil rendering does not depend on these being present.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       chromium \
       fonts-noto-core \
       fonts-noto-extra \
       ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Workspaces hoist most packages to the root node_modules, but not always
# all of them — copy both so nothing resolves to a missing module at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/package.json ./package.json

# Runtime-loaded assets, NOT compiled into dist — the paths below are what
# the code resolves via __dirname:
#   prompts/      <- PromptLoaderService  (dist/ai -> ../../prompts)
#   assets/fonts/ <- report-template.ts   (dist/reports/pdf -> ../../../assets/fonts)
#   prisma/       <- `prisma migrate deploy` at release time
COPY --from=build /app/backend/prompts ./backend/prompts
COPY --from=build /app/backend/assets ./backend/assets
COPY --from=build /app/backend/prisma ./backend/prisma

# Generated PDFs land here (dist/reports/pdf -> ../../../generated-reports).
# Mount a volume over it if the files must outlive the container; they are
# regenerable from the database either way.
RUN mkdir -p /app/backend/generated-reports \
  && chown -R node:node /app/backend/generated-reports

USER node
EXPOSE 4000

# Liveness only — deliberately not /health/ready, which also checks Postgres.
# An orchestrator should restart on liveness failure and merely stop routing
# traffic on readiness failure.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations are NOT run here — an image that migrates on boot races itself
# when scaled to more than one replica. Run this once per release, before
# rolling out:
#   docker run --rm --env-file .env.production jathakam-backend \
#     npx --workspace backend prisma migrate deploy
CMD ["node", "backend/dist/main.js"]
