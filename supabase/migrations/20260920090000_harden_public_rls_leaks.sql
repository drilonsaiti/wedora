-- Wedora security hardening: remove cross-tenant public read policies
--
-- The original single-tenant schema (supabase/schema.sql) and the early
-- guest-seating migration created several RLS policies of the shape
--
--     using (true)
--
-- with no `to authenticated` restriction, which applies to BOTH the
-- `anon` and `authenticated` Postgres roles. Those policies were never
-- dropped when the app moved to multi-tenancy (20260803000000).
--
-- Impact: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is, by design, shipped to every
-- browser. Anyone who extracts it (view-source, network tab, or simply
-- reading the deployed JS bundle) could call the Supabase REST API
-- directly, e.g.
--
--     GET {SUPABASE_URL}/rest/v1/guests?select=*
--     apikey: <anon key>
--
-- and receive every guest's first/last name across EVERY wedding on the
-- platform, not just their own -- because none of these policies filter
-- by wedding_id. The same applied to table layouts, venue elements, and
-- event/wedding names + dates.
--
-- The application itself never relies on these policies: every guest,
-- table, venue-element and event read in this codebase goes through a
-- service-role client after an explicit authorization check
-- (see actions/seating.ts:requireWeddingReadAccess,
-- actions/wedding.ts:getWeddingBySlug/getWeddingById, and the public
-- wedding page/upload page, which both use createServiceClient()).
-- The browser Supabase client (lib/supabase/client.ts) is only ever used
-- for auth (login/reset-password forms) in this repository. Dropping
-- these policies removes the leak without changing app behaviour.

begin;

drop
policy if exists "Public can read guests" on public.guests;
drop
policy if exists "Public can read tables" on public.tables;
drop
policy if exists "public_read_table_seats" on public.table_seats;
drop
policy if exists "Public can read venue elements" on public.venue_elements;
drop
policy if exists "Public can read active events" on public.events;

-- Belt-and-braces: explicitly revoke from `anon` only. `anon` has no
-- legitimate direct access to any of these five tables in this app
-- (every guest/table/venue-element/event read reachable by anonymous
-- visitors goes through a service-role client after an application
-- check), so this is pure defense in depth.
--
-- IMPORTANT: we deliberately do NOT revoke from `authenticated`. Unlike
-- guests/tables/venue_elements (which this app only ever reads/writes
-- via the service role, see actions/seating.ts), `events` is also
-- written directly by the *regular*, RLS-bound client in
-- actions/wedding.ts (createWedding) as the signed-in wedding owner, and
-- `guests` is also read directly by the regular client in
-- actions/admin.ts (getAdminDashboardStats), relying on the existing
-- admin_owns_wedding_events / admin_owns_wedding_guests / couple_read_*
-- policies to scope rows. Revoking table-level grants from
-- `authenticated` would break those already-correct code paths; the
-- fix here is only to remove the *unscoped* PUBLIC policies above.
revoke all on public.guests from anon;
revoke all on public.tables from anon;
revoke all on public.table_seats from anon;
revoke all on public.venue_elements from anon;
revoke all on public.events from anon;

-- The existing, properly wedding-scoped policies remain in effect for
-- `authenticated` users and continue to work unchanged:
--   admin_owns_wedding_guests, couple_read_guests
--   admin_owns_wedding_tables, couple_read_tables
--   admin_owns_wedding_table_seats
--   admin_owns_wedding_venue_elements
--   admin_owns_wedding_events

commit;
