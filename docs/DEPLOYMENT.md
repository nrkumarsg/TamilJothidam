# Deployment (Phase 20)

## Status of these artifacts — read this first

The configuration, validation and health-check code described here is
**verified**: it has unit and e2e tests, and the migration path below was
run against a real throwaway database.

The **Dockerfiles and `docker-compose.prod.yml` are not build-verified.**
Docker isn't installable in the development environment this project was
built in (it needs WSL2 and admin rights — the same constraint that led to
the portable Postgres in `.devdb/`). They were written carefully and each
`COPY` source was checked to exist, which caught two real defects before
they shipped — a `COPY frontend/public` for a directory that doesn't exist,
and a `backend/node_modules` copy that depended on npm workspace hoisting.
But "carefully written" is not "built and run". Expect to iterate on the
first `docker build`.

Everything else on this page — the required environment variables, the
migration procedure, the readiness semantics — applies to any hosting
target, container or not.

## What the app needs to run

| Component | Requirement |
|---|---|
| Node | 24.x (matches development; the images pin `node:24-bookworm`) |
| Postgres | 16 (any managed instance is fine — no extensions required) |
| Chromium | Only for PDF generation. `puppeteer-core` ships no browser; set `PUPPETEER_EXECUTABLE_PATH` or install at one of the paths in `pdf-renderer.ts` |
| Disk | A writable `backend/generated-reports/` if you want PDFs to survive restarts (they're regenerable from the database) |

## Configuration

Copy `.env.production.example` to `.env.production` and fill it in.
`.gitignore` excludes every `.env*` except `*.example`, so a filled-in file
cannot be committed by accident.

**The API refuses to boot in production if configuration is unsafe**
(`backend/src/config/production-readiness.ts`). It fails fast, naming the
variable and why it matters, rather than starting and breaking later:

- `DATABASE_URL` or `JWT_SECRET` missing — fatal in every environment
- `JWT_SECRET` still the placeholder published in `.env.example` — anyone
  could mint tokens for any account
- `JWT_SECRET` shorter than 32 characters
- `API_KEY_ENCRYPTION_SECRET` missing — admin-managed AI keys can't be
  encrypted or read back
- `CORS_ORIGINS` missing — the API would otherwise have to accept requests
  from any origin
- Google sign-in half-configured (one of client id / secret without the
  other), or configured without `GOOGLE_REDIRECT_URI` / `FRONTEND_URL`, so
  users would be redirected to localhost

In development these same checks only **warn**, so local work continues to
run with the placeholder secret and no CORS allowlist.

Two variables are baked in at build time, not runtime:

- `NEXT_PUBLIC_API_URL` — Next.js inlines `NEXT_PUBLIC_*` into the client
  bundle, so pointing at a different API means rebuilding the frontend image.
- Nothing else. All backend config is read from the environment at runtime.

## Database migrations

Development uses `prisma migrate dev`. **Production must use
`prisma migrate deploy`**, which applies committed migrations and never
generates or resets anything.

```bash
npx --workspace backend prisma migrate deploy
```

Run this **once per release, before rolling out new instances** — not from
the API's own startup, which would have replicas racing to migrate the same
database. `docker-compose.prod.yml` models this as a separate `migrate`
service that runs to completion before `api` starts.

Three of the four migrations were written by hand (Prisma's `migrate dev`
refuses to run non-interactively). That's a real risk, so it was checked
rather than assumed: applying all four to an empty database with
`migrate deploy`, then running

```bash
npx --workspace backend prisma migrate diff \
  --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

reports **no difference** — the migrations reproduce `schema.prisma`
exactly. Re-run that check after adding any future hand-written migration.

## Health checks

Two endpoints, deliberately different:

- **`GET /health`** — liveness. Touches nothing external. Restart the
  instance if this fails.
- **`GET /health/ready`** — readiness. Runs `SELECT 1` against Postgres and
  returns **503** if it fails. Stop routing traffic here, but do *not*
  restart: a database blip shouldn't cycle otherwise-healthy instances.

Point your orchestrator's liveness probe at the first and its readiness
probe at the second. The container `HEALTHCHECK` uses liveness only.

## First admin account

There is no self-service promotion — a user can never make themselves an
admin through the API. Promote the first one directly in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Everyone after that can be promoted from the admin panel. The role is
re-read from the database on every request, so it takes effect immediately
without re-login.

## Deploying with the provided compose file

```bash
cp .env.production.example .env.production   # then fill it in
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This builds both images, runs migrations once, then starts Postgres, the API
and the web app. Postgres is deliberately not published to the host.

**Prefer a managed Postgres for anything real.** The container in that file
has no backups, no point-in-time recovery and no patching. Delete the
`postgres` service and point `DATABASE_URL` at a managed instance.

## Not covered — known gaps

These are deliberate scope boundaries, not oversights. They matter before a
public launch:

- **No TLS termination.** Put a reverse proxy (nginx, Caddy, or your
  platform's load balancer) in front. The app speaks plain HTTP.
- **No rate limiting** on `/auth/login` or `/auth/register` — brute-force
  protection is absent (also noted in `backend/src/auth/README.md`).
- **No security headers** (HSTS, CSP, `X-Frame-Options`).
- **No token revocation.** A JWT stays valid until it expires, even after
  the account is deleted.
- **No structured/centralised logging or error tracking.** The app uses
  Nest's default logger to stdout, which containers capture, but there's no
  request correlation id or aggregation.
- **No backup or restore procedure** for the database.
- **No CI pipeline.** Spec §38 requires the full suite to run on every
  change to the calculation engine; right now that's a manual
  `npm test --workspace backend`.
