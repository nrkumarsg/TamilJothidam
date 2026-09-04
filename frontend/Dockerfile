# syntax=docker/dockerfile:1
#
# Frontend production image (Phase 20).
#
# Note NEXT_PUBLIC_API_URL is a BUILD argument, not a runtime variable:
# Next.js inlines NEXT_PUBLIC_* into the client bundle at build time, so the
# API URL is baked into the image. A different backend URL means a different
# image — that is a Next.js property, not a choice made here.
#
# Build from the REPOSITORY ROOT (npm workspaces need the root manifests):
#   docker build -f frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     -t jathakam-frontend .

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:24-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma

# The backend's postinstall runs `prisma generate`; the schema copied above
# is what makes that succeed in a frontend-only build.
RUN npm ci

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY frontend ./frontend
RUN npm run build --workspace frontend

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `output: 'standalone'` (next.config.mjs) emits a self-contained server plus
# only the node_modules it actually needs. In a workspace the server lands at
# standalone/frontend/server.js with node_modules hoisted alongside it, which
# is why the copies below preserve that layout rather than flattening it.
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
# (no frontend/public — this app ships no static assets directory; add a
# COPY for it here if one is ever introduced.)

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "frontend/server.js"]
