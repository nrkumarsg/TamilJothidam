# auth/ — Authentication + Authorization (Phase 17, spec §41)

Replaces the dev-user stand-in every profile/jathakam-scoped service used
before this phase (`profiles.service.ts`'s deleted `getOrCreateDevUser()`).
Hand-rolled email/password auth — deliberately not Passport.js, since one
strategy and a JWT issuance step don't need Passport's strategy-abstraction
machinery (same "raw fetch over SDK" reasoning as `AnthropicProvider`).

## What's here

- **`auth.service.ts`** — `register()` (bcrypt-hashes the password, 409s on
  a duplicate email), `login()` (same error message for "no such user" and
  "wrong password" — never reveals which), `deleteAccount()` (spec §41
  "User deletion" — a single `prisma.user.delete()` that cascades through
  every table this user owns via `schema.prisma`'s `onDelete: Cascade`
  chain, satisfying "Report deletion" too in the same operation).
- **`jwt-auth.guard.ts`** — verifies `Authorization: Bearer <token>` and
  attaches `request.user`. Also accepts a `?token=` query param as a
  fallback, used only by the PDF download link (`window.open()` can't
  attach a custom header) — a documented tradeoff (a token in a URL can
  leak via logs/browser history), acceptable for this project's current
  security bar.
- **`jathakam-ownership.guard.ts`** + **`ownership.util.ts`** — verify the
  authenticated user owns the `:id` (a jathakamId, or in
  `jathakam.controller.ts`'s case a `profileId`) being requested, 404ing
  (never 403ing) when it belongs to someone else — spec §41: never confirm
  another user's data even exists.
- **`current-user.decorator.ts`** — `@CurrentUser()` reads the payload
  `JwtAuthGuard` already verified.

## Where the guards are applied

Every jathakam-scoped controller now requires `JwtAuthGuard` plus
`JathakamOwnershipGuard` at the class level (Dasha, Transits,
Interpretation, Report, Pdf) since all their routes key off `:id` as a
jathakamId consistently. `JathakamController` and `ProfilesController`
check ownership inline instead — their routes mix jathakamId/profileId/body
shapes, so a single class-level guard doesn't fit.

## Sign in with Google

Added after Phase 18 at user request. Standard OAuth 2.0 Authorization
Code flow, hand-rolled via `fetch` in `google-auth.service.ts` — no
`google-auth-library` dependency, same "raw fetch over SDK" reasoning as
`AnthropicProvider`.

1. `GET /auth/google` — 302s the browser to Google's consent screen.
2. Google redirects back to `GET /auth/google/callback?code=…`.
3. The code is exchanged for an ID token at Google's token endpoint, then
   **verified by calling Google's own `tokeninfo` endpoint** rather than
   validating the JWT signature locally against Google's JWKS. Simpler and
   still secure (Google performs the verification), but Google documents
   `tokeninfo` as rate-limited and not recommended at production scale — a
   high-traffic deployment should switch to local JWKS verification.
   The response's `aud` is checked against our own `GOOGLE_CLIENT_ID`
   (rejecting a token minted for a different app) and `email_verified`
   must be `true`.
4. `AuthService.loginWithGoogle()` finds the account by `googleId`, else
   **links** to an existing local account with the same Google-verified
   email, else creates a new account with no password at all.
5. The backend issues its own JWT — identical to the email/password path —
   and redirects to `FRONTEND_URL/auth/callback?token=…`, where a small
   frontend page stores it and continues to the dashboard.

`User.passwordHash` is now nullable (Google-created accounts have none);
`login()` treats "no password set" exactly like a wrong password, with the
same generic error, so a Google-only account can't be probed for existence
via the password endpoint.

**No CSRF `state` parameter** is round-tripped through the redirect
(documented simplification). The registered `redirect_uri` is the primary
defense; a stricter deployment should add a signed `state`.

Configure via `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
`GOOGLE_REDIRECT_URI` / `FRONTEND_URL` in `backend/.env` (see
`.env.example`). Left unset, `GET /auth/google` returns a clean 503 with a
message naming the missing variables rather than failing silently.

## Known limitations (documented, not solved this phase)

- **No token revocation.** A JWT stays valid until it expires
  (`JWT_EXPIRES_IN`, default 7d) even after `DELETE /auth/me` deletes the
  account — there's no blocklist. Any subsequent request that tries to
  write data under a deleted user's id would hit a Prisma foreign-key
  error, not a clean 401. Full revocation needs a stored session/token
  table, judged out of scope for this phase.
- **No password reset / email verification flow.** Registration is
  immediate; nothing confirms the email address is real or lets a user
  recover a forgotten password.
- **8-character minimum password**, not a claim of a complete password
  policy (`dto/register.dto.ts`).
- **No rate limiting** on `/auth/login` or `/auth/register`.

These match spec §41's explicit list except where noted above; encryption
at rest, secure API key storage, and DB access control are handled at the
infrastructure/deployment layer (Phase 20), not application code.
