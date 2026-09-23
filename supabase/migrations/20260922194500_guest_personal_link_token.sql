-- Personal per-guest links
--
-- Each guest gets a stable, high-entropy token that resolves directly to
-- their own RSVP/seat-finder page (app/[locale]/[slug]/g/[token]/page.tsx),
-- without them having to type and match their name on the shared
-- find-seat page. The token is a v4 UUID (122 bits of randomness), so it
-- is safe to expose in a URL: it cannot be feasibly guessed or enumerated.
--
-- `gen_random_uuid()` is already used throughout this schema (see e.g.
-- 20260706124500_guest_seating.sql, 20260826_photo_zip_exports.sql), so
-- the pgcrypto/pgcrypto-equivalent extension it depends on is already
-- enabled on this project.
--
-- Adding a column with a non-constant default (gen_random_uuid()) backfills
-- every existing row at ALTER TABLE time on Postgres 12+ -- each existing
-- row gets its own freshly generated value, not a single shared default,
-- because a volatile default forces a full table rewrite rather than the
-- fast metadata-only path used for constant defaults. This project already
-- relies on that exact behaviour (20260826_photo_zip_exports.sql adds a
-- uuid primary key with default gen_random_uuid() to a new table; the
-- guarantee is the same for an ALTER TABLE ... ADD COLUMN). No separate
-- backfill statement is needed.
--
-- No new RLS policy is added for anon/authenticated access to this column
-- or table. Resolution goes through actions/seating.ts#getGuestByToken,
-- which uses the service-role client only after re-checking
-- wedding_settings.enable_find_seat for the exact wedding -- the same
-- public-access gate requireWeddingReadAccess() already applies to the
-- existing getGuests() find-seat path. A wedding with public guest access
-- turned off must not be resolvable via a leaked/guessed personal link
-- either.

begin;

alter table public.guests
    add column if not exists guest_token uuid not null default gen_random_uuid();

-- UNIQUE creates its own backing btree index, so no separate
-- `create index` statement is needed for equality lookups on this column.
alter table public.guests
    add constraint guests_guest_token_key unique (guest_token);

commit;