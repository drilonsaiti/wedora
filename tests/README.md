# Tests

Run with `npm test` (or `npm run test:watch` while iterating, `npm run test:coverage`
for a coverage report). Uses [Vitest](https://vitest.dev/), configured in
`vitest.config.mts`.

## What's covered

Deliberately scoped to pure logic and the highest-risk, hardest-to-eyeball-review
security surface, rather than attempting broad coverage:

- **`lib/utils.ts`** — `normalizeGuestName` (the accent/case-insensitive matcher the
  RSVP API and find-seat search both depend on to find "the same guest" safely),
  `formatBytes`, `invertUpdate` (the admin photo-moderation undo helper).
- **`lib/sharp.ts`** — `isHeicBuffer`, the file-signature check that decides whether
  an upload goes through the HEIC decode fallback. A false negative here silently
  reopens the HEIC upload gap described in the README; a false positive breaks a
  non-HEIC upload. Exported specifically so this could be tested directly.
- **`lib/rsvp-auth.ts`** — `generateRsvpApiKey`/`hashRsvpApiKey`, and
  `resolveRsvpApiActor` end-to-end (with a mocked Supabase client) covering: each of
  the three accepted auth channels (`Authorization: Bearer`, `X-Api-Key`,
  `?api_key=`), channel precedence, missing/wrong/revoked keys, a key that doesn't
  belong to the requested wedding, an unknown wedding slug, and a database error
  surfacing as 500 rather than silently passing through. This is the part of the
  codebase where a subtle bug would be a real security hole, not just a broken
  feature, so it gets the most thorough coverage here.
- **`lib/plans.ts`** — `getWeddingEntitlements`, the single source of truth every
  plan/add-on gate in the app (UI hiding *and* server-side enforcement) calls
  through: each plan's base entitlements, that add-ons only ever add on top of the
  plan (never remove something it already grants), the `guestLimit`/`storageDays`
  numeric-cap logic specifically (never lowering an uncapped plan, always raising
  to at least the add-on's floor), and that malformed input (an unrecognized plan
  or add-on id, `null`/`undefined`) falls back to the most restrictive plan
  (`basic`) instead of throwing — this runs on every gated page/action, so it can
  never be the thing that 500s or accidentally grants access.
- **`schemas/index.ts`** — the validation rules an attacker or a careless client
  could actually hit: the create/edit-wedding "at least one guest feature must stay
  on" refine, the RSVP status enum, party-size bounds, note length, and the
  guestId-must-be-a-UUID check on the admin manual-override schema.
- **`lib/login-rate-limit.ts`** — the pure helpers behind admin/couple login rate
  limiting: email normalization, the HMAC key hashing (deterministic, secret- and
  value-sensitive), that admin/couple and different emails/IPs land in separate
  buckets, the client-IP header precedence, and `getLoginRateLimitSecret`'s
  env-var fallback/throw behavior.
- **`actions/auth.ts`** (`loginAdmin`/`loginCouple`) — with a mocked Supabase
  client, covering: a successful login, wrong credentials never reaching the
  admins-table/app_metadata check, a valid Supabase login that still gets denied
  (not an admin / not a couple with a wedding_id) and signed back out, an
  exhausted rate-limit bucket blocking the attempt *before* Supabase Auth is ever
  called, and a rate-limit RPC error failing closed (denied, not let through)
  rather than silently disabling the limit.
- **`lib/csp.ts`** — `buildContentSecurityPolicy`, called per-request from
  middleware.ts with a fresh nonce: production vs. development script-src, that
  the nonce is actually scoped per-request (two different nonces never both
  appear allowlisted), and the other security-relevant directives (`object-src`,
  `frame-ancestors`, `form-action`, no open wildcard in `img-src`). This used to
  test a static CSP header built once in `next.config.js`, with the one inline
  script this app renders (next-themes' theme-flash-prevention bootstrap)
  allowlisted by a hardcoded SHA-256 hash instead of a nonce -- see lib/csp.ts's
  doc comment for why a real production outage is what prompted moving off that
  hash.

## What's NOT covered, and why

- **React components** (`components/**`) and **pages** (`app/**`) — no
  `@testing-library/react` / jsdom setup yet. These are mostly thin wiring around
  Server Actions and would need real DOM/interaction testing to be worth much more
  than a snapshot test; adding that is a reasonable next step but a separate one
  (different test environment, different dependencies) from this pass.
- **Server Actions end-to-end** (`actions/**`) and the **RSVP API route handlers**
  as HTTP endpoints — these call Supabase for real (RLS, RPC functions, Storage) and
  are better covered by integration tests against a real (local/test) Supabase
  project than by mocking the entire Supabase client surface, which would mostly
  test the mocks. `lib/rsvp-auth.ts`'s `resolveRsvpApiActor` is the one exception:
  it's small, self-contained, and security-critical enough that mocking Supabase for
  it was worth doing anyway.
- **The Postgres RPC functions** (`consume_rsvp_rate_bucket`,
  `finalize_guest_photo_upload`, `begin_guest_photo_upload`, ...) — these are SQL,
  not TypeScript, so they're outside what Vitest can exercise. If you want these
  tested, [pgTAP](https://pgtap.org/) or a Supabase CLI–based integration test
  against a real local Postgres instance is the right tool, not a JS mock.
- **Image processing** (`processImage` in `lib/sharp.ts` beyond `isHeicBuffer`) —
  exercising the actual Sharp/heic-convert decode path needs real image fixture
  files (a real HEIC file, a real JPEG) and produces binary output that's awkward to
  assert on meaningfully in a unit test. Worth adding as a fixture-based test later
  if this pipeline changes often; not done here.