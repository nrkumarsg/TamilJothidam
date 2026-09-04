# admin/ — Admin Panel API (Phase 18, spec §35)

Every route here requires `JwtAuthGuard` + `AdminGuard` — `AdminGuard`
re-reads the user's role from the database on every request rather than
trusting the JWT payload's `role` claim (see `admin.guard.ts`'s comment):
a stale claim would mean a freshly-promoted admin can't act until they
log in again, and — the more serious direction — a demoted admin would
keep admin access for the rest of their token's lifetime. Verified live:
demoting a user via direct DB update revokes their `/admin/*` access on
their very next request, no re-login involved.

## Bootstrapping the first admin

There is no self-service promotion endpoint (a `USER` can never make
themselves `ADMIN` through the API — that would defeat the point). The
first admin account must be promoted directly in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Every subsequent admin can be promoted through the panel itself
(`PATCH /admin/users/:id { "role": "ADMIN" }`).

## What each spec §35 bullet maps to

| spec §35 capability | Endpoint(s) | Real DB-backed? |
|---|---|---|
| Manage users | `GET/PATCH/DELETE /admin/users` | Yes |
| View generated reports | `GET /admin/reports` | Yes |
| View calculation logs / AI usage / token usage / errors | `GET /admin/usage`, `GET /admin/usage/summary` | Yes — one unified log (`logging/usage-log.service.ts`), not four separate features |
| Manage API keys | `GET/POST/DELETE /admin/api-keys` | Yes — AES-256-GCM encrypted at rest (`crypto.util.ts`), never returned in plaintext |
| Manage yoga rules / dosha rules / astrology rules | `GET /admin/rules/yogas`, `GET /admin/rules/doshas` | **Read-only.** Rules are TypeScript functions (`rules/yoga/`, `rules/dosha/`), not database rows — a live "edit" endpoint would need the rule engine rebuilt as data-driven, judged out of scope for this phase. |
| Manage prompts | `GET /admin/prompts` | **Read-only.** Prompts are markdown files on disk (`backend/prompts/`); listing shows path + last-modified, no in-app editor. |
| Manage languages | `GET /admin/languages` | **Read-only.** `Language` is a fixed Prisma enum; this reports which locales are actively translated (Phase 14's glossary) vs merely recognized by the type. |
| Manage AI providers | `GET /admin/ai-providers` | **Read-only** for which providers are implemented/active — switching the active provider still requires the `AI_DEFAULT_PROVIDER` env var and a restart, not a live toggle. |
| Manage remedies | `GET /admin/remedies` | Real query, but the `Remedy` table has no writer yet — spec §28 section 32 ("remedies") is still `unavailable` in Phase 15's report classification, so this list is empty until a future phase generates any. |

## logging/ (used by, not part of, admin/)

`backend/src/logging/usage-log.service.ts` is a small standalone module
(not nested under `admin/`) so `InterpretationService`, `PdfService`, and
`JathakamController` can write to it without depending on the admin
module. Every write is swallowed on failure — an audit log must never be
the reason a real request fails.
