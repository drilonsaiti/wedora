# Wedora

Wedora is a multi-tenant wedding-guest-experience platform. Each wedding gets its own
branded microsite (`your-domain.com/<slug>`) for guest photo sharing and find‑my‑seat,
plus a couple/admin dashboard for seating design, photo moderation, gallery sharing, and
(new) RSVP — all backed by Next.js Server Actions and Supabase (Postgres + RLS + Auth +
Storage).

This README documents the project **as it actually behaves today**, including a security
hardening pass that was applied on top of the original schema (see
[Security notes](#security-notes)).

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Roles & access model](#roles--access-model)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [RLS & security summary](#rls--security-summary)
- [Photo uploads](#photo-uploads)
- [RSVP API](#rsvp-api)
- [Local development](#local-development)
- [Tests](#tests)
- [Deployment (Vercel + Supabase)](#deployment-vercel--supabase)
- [Manual QA checklist](#manual-qa-checklist)
- [Security notes](#security-notes)
- [Known limitations / roadmap](#known-limitations--roadmap)

---

## Features

- **Guest photo sharing** — anonymous, upload-only guest flow with client-side
  compression, server-side Sharp optimisation (WebP original + 400×400 thumbnail),
  robust HEIC/HEIF decoding for iPhone photos, per-session and per-IP server-side
  rate limiting, and a moderation queue (approve / hide / favourite) for the
  couple/admin — or an opt-in per-wedding toggle to skip the queue and publish
  instantly. See [Photo uploads](#photo-uploads).
- **ZIP export** — synchronous streaming ZIP for small albums, a queued
  worker-based export (with a signed, expiring download link) for large ones.
- **Find my seat** — guests search their own name (accent- and case-insensitive) on
  the public wedding page and see their table/seat; admins design the venue and seating
  chart with a drag-and-drop editor (`@dnd-kit`).
- **Shareable galleries** — tokenized, optionally expiring public links to a slideshow
  of approved photos, with independent "show messages" and "favourites only" toggles.
- **RSVP API** *(new)* — an external site/form can confirm, decline, or reset a guest's
  RSVP by name through a per-wedding API key, without ever touching Supabase directly.
  The admin guest list also shows each guest's current RSVP status as a colored badge
  (pending/confirmed/declined) that an admin can click to cycle and set manually —
  e.g. after a phone call or paper reply. See [RSVP API](#rsvp-api).
- **Multi-tenant** — any number of weddings on one deployment, each with its own slug,
  theme hue, and feature toggles (`enable_find_seat`, `enable_photo_upload`,
  `enable_couple_login`, photo limits, retention window).
- **Three access roles** — platform admin, wedding owner, and an assigned couple login
  (see below).
- **i18n** — English, German, French, Italian, Turkish, Albanian, Macedonian via
  `next-intl`.

---

## Architecture

- **Next.js 16 App Router** (Turbopack), server components by default, client
  components only where there's real interactivity.
- **Supabase** — Postgres with Row Level Security enforced server-side, Auth
  (admin + couple logins), Storage (`photos`, `thumbnails`, `photo-exports` buckets,
  all private).
- **Server Actions** for essentially all reads/writes from the app itself
  (`actions/*.ts`); a small number of **Route Handlers** under `app/api/**` for
  things Server Actions can't do: cron jobs, the streaming ZIP download, the
  Supabase auth callback, and the RSVP API that's meant to be called from *outside*
  this app.
- **Sharp** for server-side image processing, **fflate** for streaming ZIP archives,
  **@dnd-kit** for the seating designer, **framer-motion** for guest-facing UI,
  **next-intl** for i18n, **zod** for all input validation.
- Every table/venue/photo mutation goes through a **service-role Supabase client**
  *after* an explicit, hand-written authorization check in the action itself — RLS is
  a second line of defense, not the only one.

---

## Folder structure

```
wedora/
├── app/
│   ├── [locale]/                          # every locale-prefixed page
│   │   ├── [slug]/                        # public wedding microsite
│   │   │   ├── page.tsx                   # home: couple names, find-seat search, upload CTA
│   │   │   ├── find-seat/page.tsx
│   │   │   └── upload/page.tsx
│   │   ├── admin/                         # platform-admin area
│   │   │   ├── login|forgot-password|reset-password/
│   │   │   └── (protected)/
│   │   │       ├── dashboard/             # cross-wedding stats
│   │   │       └── weddings/
│   │   │           ├── page.tsx           # all weddings list
│   │   │           ├── new/page.tsx       # create a wedding
│   │   │           └── [weddingId]/       # dashboard · seating · photos · settings
│   │   ├── couple/                        # couple login + limited dashboard
│   │   │   └── weddings/[weddingId]/      # seating (read-only) · photos
│   │   ├── gallery/[token]/               # public tokenized shared gallery/slideshow
│   │   └── demo/                          # sandboxed find-seat/upload demo, no real data
│   └── api/
│       ├── admin/zip/                     # synchronous ZIP download (small albums)
│       ├── auth/callback/                 # Supabase auth code exchange
│       ├── cron/cleanup-photos/           # scheduled photo retention cleanup
│       ├── internal/photo-zip-worker/     # queued ZIP export worker
│       └── public/rsvp/                   # external RSVP API — see below
│           ├── route.ts                   # POST update, GET single lookup
│           └── list/route.ts              # GET bulk list/sync
├── actions/
│   ├── wedding.ts      # create/update wedding + couple credential provisioning
│   ├── seating.ts      # guests, tables, table_seats, venue_elements
│   ├── admin.ts         # photo moderation, signed URLs, gallery tokens, dashboard stats
│   ├── gallery.ts       # public gallery token → photo list resolution
│   ├── upload.ts        # guest photo upload (rate-limited, crash-recoverable)
│   └── rsvp.ts           # RSVP API key management + manual RSVP override
├── components/
│   ├── admin/            # dashboard, seating designer, guest/table forms, RSVP key manager, ...
│   ├── couple/            # couple login + seating view
│   ├── gallery/, landing/, demo/, ui/
│   └── find-seat-client.tsx, home-search.tsx, upload-form.tsx, ...
├── lib/
│   ├── supabase/server.ts    # createClient() (RLS-bound) + createServiceClient()
│   ├── supabase/client.ts    # browser client — used only for auth forms
│   ├── rsvp-auth.ts           # RSVP API key hashing/verification + rate limiting
│   ├── photo-zip-auth.ts      # shared auth for the ZIP export routes
│   ├── sharp.ts, compress.ts, seat-generator.ts, theme.ts, validation.ts, utils.ts
│   └── i18n.ts, navigation.ts
├── schemas/index.ts       # every zod schema (upload, guests, tables, weddings, RSVP, ...)
├── types/
│   ├── database.ts        # hand-maintained Supabase `Database` type (see note below)
│   └── seating.ts
├── supabase/
│   ├── schema.sql              # original bootstrap: events/photos/admins/venue_elements + RLS
│   ├── schema-additions.sql    # gallery_tokens bootstrap addition
│   └── migrations/             # everything since — apply in filename order, see below
├── messages/{en,de,fr,it,tr,sq,mk}.json   # next-intl translation files
├── middleware.ts            # locale routing + Supabase auth cookie refresh + route guards
└── vercel.json               # cron schedules for the two background jobs
```

> **Note on `types/database.ts`:** it's a hand-maintained Supabase `Database` type
> (some tables were added by migration without ever running
> `supabase gen types typescript` again). If you regenerate it from your live
> database, diff it against this file first — a couple of tables
> (`photo_upload_rate_limits`, `photo_upload_cleanup_jobs`) still won't appear in a
> fresh generation being picked up by existing code unless you also keep the `as any`
> casts in `actions/upload.ts` / the ZIP routes, or extend the generated file the same
> way this one is extended for `wedding_rsvp_api_keys` / `rsvp_api_rate_limits`.

---

## Roles & access model

Three distinct identities, all backed by Supabase Auth:

| Role | How it's granted | Scope | Where it's used |
|---|---|---|---|
| **Platform admin** | A row in `public.admins` (created manually via SQL — see setup) | Every wedding | `/admin/**` |
| **Wedding owner** | Whoever's `auth.uid()` called `createWedding()` — stored as `weddings.owner_user_id` | Only their own wedding | Server actions & RLS (`is_wedding_owner()`) |
| **Couple** | Auto-provisioned when a wedding is created with a groom/bride email; `app_metadata = { role: 'couple', wedding_id }` | Only their own wedding, and only if `wedding_settings.enable_couple_login` is on | `/couple/**` |

Every server action that touches wedding-scoped data (`requireWeddingAccess`,
`requireWeddingReadAccess`, `requireWeddingPhotoAccess`, `authorizePhotoZipWedding`,
`is_wedding_owner()` in RLS, ...) already understands all three roles.

**Self-service today happens through `/couple/**`, not `/admin/**`.** The
`/admin/**` page-level guards (the layout at
`app/[locale]/admin/(protected)/layout.tsx` plus the nested wedding/settings pages)
intentionally redirect anyone who isn't a platform admin — `/admin` is the *platform
operator's* console for provisioning and managing every wedding on the deployment, not
a self-serve area. A wedding's own couple signs in at `/couple/login` and gets a scoped
dashboard (`app/[locale]/couple/weddings/[weddingId]/`) for seating (read-only) and
photos, gated by `enable_couple_login` and `is_couple_for_wedding()`. For this
product, the couple *is* the self-serve customer — `/couple` is the whole story there,
and there's no separate self-service tier missing.

`weddings.owner_user_id` is a different thing, and worth not confusing with the above:
it's set to whichever platform admin called `createWedding()` (currently the only path
to that action is `/admin/weddings/new`, itself admin-gated), so in practice it's
always an admin's `auth.uid()`, not the couple's — the couple gets its own,
separately-provisioned login (`generateRandomPassword()` + `app_metadata.role =
'couple'`) with no relationship to `owner_user_id` at all. `is_wedding_owner()` /
`requireWeddingAccess`'s "owner" branch exist so that, if you ever let an admin-level
user manage only a subset of weddings (an agency managing several couples' weddings,
say) rather than every admin seeing every wedding, that scoping already works — it's
forward-looking plumbing for a platform-admin concern, not a missing couple-facing
feature.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public by design — shipped to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only.** Never expose to the client |
| `NEXT_PUBLIC_APP_URL` | yes | Used to build gallery/QR links |
| `NEXT_PUBLIC_EVENT_ID` | legacy | Only used by the old single-event `/upload` fallback; not needed for the multi-tenant `/[slug]/upload` flow |
| `MAX_FILE_SIZE_MB` | yes | Upload size cap (also hard-capped at 10 MB server-side) |
| `CRON_SECRET` | yes | Bearer secret for `/api/cron/cleanup-photos`. **Must be set** — the route now fails closed if it's missing |
| `ZIP_WORKER_SECRET` | yes | Bearer secret for `/api/internal/photo-zip-worker` |
| `UPLOAD_RATE_LIMIT_SECRET` | recommended | HMAC pepper for hashing session/IP rate-limit keys; falls back to the service role key if unset |

---

## Supabase setup

1. **Create a project** at supabase.com.
2. **Run the bootstrap SQL**, in the Supabase SQL Editor, in this order:
    - `supabase/schema.sql`
    - `supabase/schema-additions.sql`
3. **Run every migration in `supabase/migrations/`, in filename order** (they're
   timestamp-prefixed, so sorting the filenames gives you the right order):
   ```
   20260706124500_guest_seating.sql
   20260706213253_add_is_public_to_photos.sql
   20260706221140_photos_approved_default_false.sql
   20260708084415_gallery_tokens_photo_filter.sql
   20260803000000_multi_tenancy_foundation.sql
   20260805093919_add_new_column_to_venue_elements.sql
   20260805150237_add_new_column_to_tables.sql
   20260805152744_fix_contraint_unique.sql
   20260806103017_add_limits_for_photos.sql
   20260806104525_change_column.sql
   20260806120631_add_photo_retention_days_to_weddings.sql
   20260825_photo_upload_hardening.sql
   20260826_photo_zip_exports.sql
   20260920090000_harden_public_rls_leaks.sql   # security fix — see below
   20260920093000_rsvp_api.sql                  # RSVP feature
   20260921090000_auto_approve_uploads.sql      # moderation-hold toggle
   ```
   Each file is idempotent-ish (`if not exists` / `drop policy if exists` where it
   matters) but isn't designed to be run twice blindly — if you're not using the
   Supabase CLI's migration tracking, keep your own note of which ones you've applied.
4. **Create the storage buckets** `photos`, `thumbnails`, and `photo-exports` if the
   SQL didn't create them for you (check **Storage** in the dashboard) — they must all
   be **private**.
5. **Create your first platform admin.** In **Authentication → Users**, create a user
   with email + password, then in the SQL Editor:
   ```sql
   insert into public.admins (id, email)
   values ('USER-UUID-FROM-AUTH', 'admin@yourdomain.com');
   ```
6. **Log in** at `/admin/login` with that user and create your first wedding from
   **Admin → Weddings → New**.

---

## RLS & security summary

| Data | Who can read it | Who can write it |
|---|---|---|
| A wedding's guests / tables / venue layout | Admin, that wedding's owner, or its assigned couple (if `enable_couple_login`) — **always via a service-role client after an app-level check**, never a direct anonymous query | Admin or that wedding's owner |
| A wedding's photos | Admin, owner, couple (moderation view); the public only via a valid **gallery token**, scoped to that wedding, approved + public + non-hidden photos only | Guests may *insert* (upload) only, subject to server-side rate limits and per-wedding photo caps |
| RSVP status | Admin/owner/couple via the app; externally, only with a valid, non-revoked **per-wedding RSVP API key** | Admin/owner (manual override) or a valid RSVP API key, scoped to that one wedding |
| Storage objects (`photos`, `thumbnails`, `photo-exports`) | Admin/owner/couple via short-lived signed URLs generated server-side | Guests may upload; nothing is ever publicly readable by path |

As of the `20260920090000_harden_public_rls_leaks.sql` migration, **nothing in this
app is readable with just the public anon key** — every guest, table, venue-element,
event, and photo read goes through a service-role client behind an explicit
authorization check. Earlier versions of the schema had a handful of
`using (true)` policies (`"Public can read guests"`, `"Public can read tables"`, etc.)
left over from before multi-tenancy that let anyone with the anon key read every
wedding's guest list directly against the Supabase REST API; those are now dropped.
If you're running an older deployment, apply that migration.

---

## Photo uploads

### Auto-approve uploads

Every wedding is moderated by default: a guest upload lands with
`photos.approved = false`, and the public gallery only ever shows
`approved = true` rows — nothing a guest uploads is visible to anyone until an
admin/owner approves it in **Admin → Photos**.

**Admin → Weddings → (a wedding) → Settings → Guest features → "Skip photo
moderation"** flips that per wedding: turn it on and new uploads are inserted
already `approved = true`, so they show up in the gallery immediately — useful
for a couple who wants a live "photo wall" feel during the reception and trusts
their guests, at the cost of no chance to screen anything first. It's off by
default and has to be explicitly turned on; nothing changes for a wedding that
never touches this setting.

Implementation: `wedding_settings.auto_approve_uploads` (migration
`20260921090000_auto_approve_uploads.sql`), read inside the same
`finalize_guest_photo_upload()` SECURITY DEFINER RPC that already enforces the
photo-count limits under an advisory lock — so this isn't a second code path
that could drift from the one enforcing quotas, it's the same insert with one
more value read from settings. Photos already approved before you turn the
toggle on or off are untouched either way; it only affects uploads finalized
after the change.

### HEIC/HEIF uploads

iPhones shoot HEIC by default. The client already tries to normalize that
before upload — `components/upload-form.tsx` runs the file through
`blueimp-load-image` and `browser-image-compression` to re-orient and
re-encode it to JPEG — but every one of those steps has a silent
"return the original file" fallback if it throws, and in-browser HEIC decoding
is known to be inconsistent on some iOS Safari/WebKit versions and simply
unsupported on most non-Safari browsers. So a raw, unconverted HEIC/HEIF
buffer reaching the server is an expected case, not a bug to prevent upstream.

`lib/sharp.ts`'s `processImage()` now handles that directly: it checks the
actual file bytes (the `ftyp` box of the ISO-base-media container, not the
client-reported MIME type, which can be wrong) for a HEIC/HEIF brand, and if
found, decodes it with `heic-convert` — a pure JS/WASM decoder — into a JPEG
buffer *before* handing anything to Sharp. This means a HEIC upload no longer
depends on whether the deployed Sharp binary happens to have libheif support
compiled in (not guaranteed across hosting providers/prebuilt binaries); it's
decoded the same way every time, regardless of platform. If `heic-convert`
itself can't decode a given file (corrupt upload, an exotic HEIC variant),
`processImage()` throws and the upload fails cleanly with `INVALID_FILE`
rather than silently corrupting or mis-processing it.

### Shared gallery caching

`actions/gallery.ts`'s `getGalleryPhotosAction()` used to call Supabase
Storage's `createSignedUrls` fresh on **every** gallery page load/scroll,
even though the signed URLs it hands out are valid for 24h and the
underlying photos don't change once approved. Two costs from that: every
repeat visitor burned a fresh Storage API round-trip for photos nobody had
touched, and — worse for actual page speed — the signed URL string itself
changed on every visit, so the browser (and any CDN in front of it) could
never recognize "I already have this image" and cache it.

The photo-query + signed-URL-signing step is now wrapped in `unstable_cache`,
keyed by `(wedding_id, photo_filter, offset)` and revalidated every hour —
comfortably inside the 24h signed-URL expiry, so a cached response's URLs
are never served after they'd have gone stale. It's tagged with the same
`gallery-wedding-${weddingId}` tag that photo moderation actions
(`actions/admin.ts`'s `revalidateWeddingPhotos()`) already invalidate on
approve/hide/favourite/new-upload, so a moderation change still shows up
immediately rather than waiting out the hour. `show_messages` (which
redacts guest name/message per gallery link) is deliberately *not* part of
the cache key — it's applied after the cached fetch returns, so two
different share links into the same wedding's photos (one showing messages,
one not) share the same cached signed URLs instead of duplicating the
Storage signing work.

---

## RSVP API

Lets an external site or form (a Squarespace/Wix embed, a separate invitation site,
anything else) confirm, decline, or reset a guest's RSVP by name — and read it back —
without ever needing a Supabase login. It's designed to be the *only* thing such a
system needs to integrate with.

### 1. Get an API key

In the app: **Admin → Weddings → (a wedding) → Settings → RSVP API** → *Create key*.
Give it a label (e.g. `"Squarespace RSVP form"`) so you can tell keys apart later.

**The raw key is shown exactly once**, immediately after creation — copy it now.
Only its SHA-256 hash is stored; if you lose it, revoke it and create a new one.
Format: `wr_live_<43 random url-safe base64 characters>` (256 bits of entropy).

### 2. Authenticate every request

Every RSVP endpoint requires the API key, sent through **any one** of these (checked
in this order, first one found wins):

1. `Authorization: Bearer <api key>` header — preferred when your tool can set
   arbitrary headers.
2. `X-Api-Key: <api key>` header — for tools that let you add a custom header but
   balk at `Authorization` specifically (some no-code webhook builders reserve it).
3. `?api_key=<api key>` query parameter — for tools that can only build a URL (e.g.
   a simple Google Apps Script `UrlFetchApp.fetch(...)`, an embedded form's plain
   webhook field). **Trade-off:** a key in the URL can end up in server access logs,
   browser history, or a reverse proxy's logs, so prefer a header when you can. Use
   this only when the calling tool genuinely can't set headers.

Plus a `weddingSlug` (the same slug in `https://your-domain.com/<slug>`) identifying
*which* wedding this key/request is for — a key only works for the wedding it was
created under.

Every accepted channel is verified identically once the raw key is extracted (hashed,
looked up per-wedding, checked for revocation, constant-time compared) — the security
model doesn't weaken based on which channel you use, only the exposure risk of the
transport itself does (see the query-param trade-off above).

Guests are matched by **first + last name**, normalized (accents stripped, case
folded, whitespace collapsed) so `"Besartë"` matches `"besarte"`. If two guests in the
same wedding share a name, the API returns `409 AMBIGUOUS_GUEST` instead of guessing
which one you meant.

### 3. Endpoints

#### `POST /api/public/rsvp` — confirm / decline / reset an RSVP

```http
POST /api/public/rsvp
Authorization: Bearer wr_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "weddingSlug": "sara-drilon",
  "firstName": "Elira",
  "lastName": "Krasniqi",
  "status": "confirmed",        // "confirmed" | "declined" | "pending"
  "partySize": 2,                // optional, integer 0-50
  "note": "Vegetarian please"    // optional, string, max 500 chars
}
```

`200 OK`:

```json
{
  "guest": {
    "id": "5b6d2e2e-...",
    "firstName": "Elira",
    "lastName": "Krasniqi",
    "rsvpStatus": "confirmed",
    "rsvpPartySize": 2,
    "rsvpNote": "Vegetarian please",
    "rsvpRespondedAt": "2026-09-20T18:04:00.000Z"
  }
}
```

#### `GET /api/public/rsvp` — look up one guest's current RSVP

```http
GET /api/public/rsvp?weddingSlug=sara-drilon&firstName=Elira&lastName=Krasniqi
Authorization: Bearer wr_live_...
```

Same response shape as above. Read-only — use this to show "you already responded:
confirmed" before letting someone resubmit.

#### `GET /api/public/rsvp/list` — bulk export / sync

```http
GET /api/public/rsvp/list?weddingSlug=sara-drilon&status=confirmed&limit=100&offset=0
Authorization: Bearer wr_live_...
```

`status` is optional (`pending` | `confirmed` | `declined` — omit for everyone).
`limit` defaults to 100, capped at 500. Response:

```json
{
  "guests": [
    { "id": "...", "firstName": "...", "lastName": "...", "rsvpStatus": "confirmed", "rsvpPartySize": 2, "rsvpNote": null, "rsvpRespondedAt": "..." }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

### 4. Errors

Every error is `{ "error": "<human message>", "code": "<CODE>" }`.

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `MISSING_WEDDING` / `INVALID_JSON` | Malformed or missing field |
| 401 | `MISSING_API_KEY` | No key found in `Authorization`, `X-Api-Key`, or `?api_key=` |
| 401 | `INVALID_API_KEY` | Wrong, unknown, or revoked key for that wedding |
| 404 | `WEDDING_NOT_FOUND` | No wedding with that slug |
| 404 | `GUEST_NOT_FOUND` | No guest matches that name in this wedding |
| 409 | `AMBIGUOUS_GUEST` | Two or more guests share that exact name |
| 429 | `RATE_LIMITED` | Too many requests from this key; see the `Retry-After` header (seconds) |
| 500 | `*_FAILED` / `UNEXPECTED_ERROR` | Server-side failure — safe to retry |

### 5. Rate limits

Each key has its own bucket, independent of every other key/wedding:

- Writes (`POST /api/public/rsvp`): **20 requests / 60 seconds**
- Reads (`GET /api/public/rsvp`): **60 requests / 60 seconds**
- List (`GET /api/public/rsvp/list`): **30 requests / 60 seconds**

A `429` includes `Retry-After` (seconds until the window resets). This is enforced
server-side in Postgres (`consume_rsvp_rate_bucket`, advisory-locked), not just in the
Next.js process, so it holds up across multiple server instances.

### 6. Revoking a key

Same **Settings → RSVP API** panel → trash icon next to a key. Revocation is
immediate — the very next request with that key gets `401 INVALID_API_KEY`. A guest's
already-recorded RSVP is untouched by revoking the key that set it.

### 7. What it does *not* do (yet)

- It doesn't create or delete guests — only update the RSVP status of a guest that
  already exists in Wedora's guest list (added via **Admin → Seating**). This is
  intentional: it keeps the API from being usable to enumerate or spam-create guests.
- There's no webhook/push from Wedora back out to your external site — it's currently
  pull-only (you call Wedora). If you need Wedora to notify *you* when an RSVP changes
  from inside the app (e.g. the couple manually overrides one), that'd be a webhook
  feature to add on top of this. If it's ever added, it should be a single
  digest/event-stream style webhook (or nothing) — not one HTTP call per RSVP change,
  for the same reason bulk photo uploads shouldn't each fire an email (see below).

---

## Local development

```bash
npm install
cp .env.example .env.local
# fill in .env.local

npm run dev
```

App runs at `http://localhost:3000`. Other scripts: `npm run build`, `npm run start`,
`npm run lint` (runs `eslint .` against `eslint.config.mjs`, ESLint 9's flat-config
format — Next.js 16 dropped the `next lint` subcommand entirely, and the old
`.eslintrc.json` predated flat config anyway, so both had to change together),
`npm test` (see [Tests](#tests)).

---

## Tests

```bash
npm test              # run once
npm run test:watch    # re-run on change
npm run test:coverage # with a coverage report
```

[Vitest](https://vitest.dev/)-based, no database or network required. Scoped
deliberately to pure logic and the RSVP API's auth resolution (`lib/rsvp-auth.ts`,
`lib/sharp.ts`'s HEIC detection, `lib/utils.ts`, `schemas/index.ts`) — the parts of
the codebase where a subtle bug is a security hole or a silently-wrong guest match,
not just a broken UI. **This is a starting point, not full coverage**: React
components, Server Actions end-to-end, the RSVP API route handlers as HTTP
endpoints, and the Postgres RPC functions are all untested for now. See
`tests/README.md` for exactly what's covered and, just as importantly, what isn't
and why — including what tool would actually be right for each of those (Testing
Library for components, pgTAP for the RPC functions, etc.), so extending this
doesn't mean reaching for the same hammer everywhere.

---

## Deployment (Vercel + Supabase)

1. Push to GitHub, import the repo at vercel.com.
2. Set every variable from [Environment variables](#environment-variables) in
   Vercel's project settings.
3. Deploy. Vercel handles the App Router and Server Actions automatically; Sharp
   needs the Node.js runtime, which is the default here (nothing to change).
4. `vercel.json` already wires up the two cron jobs:
    - `/api/cron/cleanup-photos` — daily at 03:00, deletes photos past each wedding's
      retention window
    - `/api/internal/photo-zip-worker` — every minute, processes queued ZIP exports
5. Add your custom domain under **Settings → Domains**, then update
   `NEXT_PUBLIC_APP_URL` to match.

### QR codes

Point a QR code at `https://your-domain.com/<slug>` (or `/<slug>/upload` to jump
straight to the camera). Any QR generator works; print at least 5×5cm with a quiet
zone border for table cards / programs / welcome signs.

---