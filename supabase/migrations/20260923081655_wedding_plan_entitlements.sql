begin;

/*
 * Every wedding is created manually by an admin right now (no payment
 * processor is wired up yet -- see components/pricing-section.tsx). This
 * adds a `plan` + `addons` pair to `weddings` so the admin can record what
 * was actually sold, and the app can gate paid-only features (personal
 * guest links, table arrangement, bulk photo export, RSVP API access,
 * etc.) both in the UI and on the server. See lib/plans.ts for the single
 * source of truth mapping plan/addons -> which features are unlocked --
 * that file's PLAN_IDS/ADDON_IDS lists must stay in sync with the check
 * constraints below.
 */

alter table public.weddings
    add column if not exists plan text not null default 'basic'
    check (plan in ('basic', 'premium', 'unlimited', 'custom'));

alter table public.weddings
    add column if not exists addons text[] not null default '{}'::text[];

comment on column public.weddings.plan is
    'Which pricing tier this wedding was sold on. Drives feature entitlements -- see lib/plans.ts.';
comment on column public.weddings.addons is
    'A la carte add-ons purchased on top of `plan` (e.g. {personalGuestLinks, bulkPhotoExport}). See lib/plans.ts ADDON_IDS.';

commit;