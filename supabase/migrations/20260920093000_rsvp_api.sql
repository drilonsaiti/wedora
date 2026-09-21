-- Wedora RSVP API
--
-- Lets an external site/form (built and hosted anywhere else) confirm,
-- decline, or reset a guest's RSVP by name, and lets it read RSVP status
-- back, without ever needing a Supabase/admin login. Access is gated by
-- a per-wedding API key that the wedding owner/admin generates from the
-- app; the raw key is only ever shown once at creation time (only its
-- hash is stored), matching how the rest of this codebase treats
-- secrets (see ZIP_WORKER_SECRET / CRON_SECRET comparisons).

begin;

-- ============================================================
-- GUESTS: RSVP FIELDS
-- ============================================================

alter table public.guests
    add column if not exists rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'confirmed', 'declined')),
    add column if not exists rsvp_party_size integer
    check (rsvp_party_size is null or rsvp_party_size >= 0),
    add column if not exists rsvp_note text
    check (rsvp_note is null or char_length (rsvp_note) <= 500),
    add column if not exists rsvp_responded_at timestamptz,
    add column if not exists rsvp_source text
    check (rsvp_source is null or rsvp_source in ('admin', 'api', 'find_seat'));

create index if not exists guests_rsvp_status_idx on public.guests (wedding_id, rsvp_status);

-- ============================================================
-- API KEYS (one active key per wedding)
-- ============================================================
--
-- Raw key format issued to the caller (never stored): wr_live_<43 url-safe base64 chars>
-- key_prefix: first 12 characters of the raw key (e.g. "wr_live_ab12"), stored in the
--   clear purely so the owner can recognise which key is which; NOT sufficient on its
--   own to authenticate.
-- key_hash: sha256(raw key) hex digest. The raw key has 256 bits of entropy, so a plain
--   (unsalted) hash is sufficient here -- there is nothing to brute force offline.

create table if not exists public.wedding_rsvp_api_keys
(
    id
    uuid
    primary
    key
    default
    gen_random_uuid
(
),
    wedding_id uuid not null references public.weddings
(
    id
) on delete cascade,
    key_prefix text not null,
    key_hash text not null unique,
    label text,
    created_at timestamptz not null default now
(
),
    created_by uuid references auth.users
(
    id
)
  on delete set null,
    last_used_at timestamptz,
    revoked_at timestamptz
    );

create index if not exists wedding_rsvp_api_keys_wedding_id_idx
    on public.wedding_rsvp_api_keys (wedding_id)
    where revoked_at is null;

create index if not exists wedding_rsvp_api_keys_prefix_idx
    on public.wedding_rsvp_api_keys (key_prefix)
    where revoked_at is null;

alter table public.wedding_rsvp_api_keys enable row level security;

-- API key management is performed only through server actions using
-- the service role after explicit wedding authorization.
-- No direct anon/authenticated access is required.
revoke all on public.wedding_rsvp_api_keys from anon, authenticated;

-- Track which key last touched a guest's RSVP, for audit purposes.
alter table public.guests
    add column if not exists rsvp_updated_by_key_id uuid
    references public.wedding_rsvp_api_keys(id) on
delete
set null;

-- ============================================================
-- RATE LIMIT STATE (per wedding + per API key)
-- ============================================================

create table if not exists public.rsvp_api_rate_limits
(
    wedding_id
    uuid
    not
    null
    references
    public
    .
    weddings
(
    id
) on delete cascade,
    key_hash text not null,
    window_started_at timestamptz not null default now
(
),
    request_count integer not null default 0 check
(
    request_count
    >=
    0
),
    updated_at timestamptz not null default now
(
),
    primary key
(
    wedding_id,
    key_hash
)
    );

create index if not exists rsvp_api_rate_limits_updated_at_idx
    on public.rsvp_api_rate_limits (updated_at);

alter table public.rsvp_api_rate_limits enable row level security;
revoke all on public.rsvp_api_rate_limits from anon, authenticated;

-- ============================================================
-- RATE BUCKET CONSUMER
--
-- Returns 0 when allowed, otherwise the number of seconds until the
-- current window opens again. Mirrors
-- public.consume_photo_upload_rate_bucket's locking strategy.
-- ============================================================

create
or replace function public.consume_rsvp_rate_bucket(
    p_wedding_id uuid,
    p_key_hash text,
    p_limit integer,
    p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
v_now timestamptz := clock_timestamp();
    v_window_started_at
timestamptz;
    v_request_count
integer;
    v_retry
integer;
begin
    if
p_key_hash is null or length(p_key_hash) < 16 then
        raise exception 'Invalid rate-limit key';
end if;

    if
p_limit < 1 or p_window_seconds < 1 then
        raise exception 'Invalid rate-limit configuration';
end if;

    perform
pg_advisory_xact_lock(
        hashtextextended('wedora:rsvp-rate:' || p_wedding_id::text || ':' || p_key_hash, 0)
    );

delete
from public.rsvp_api_rate_limits
where wedding_id = p_wedding_id
  and updated_at < clock_timestamp() - interval '7 days';

select window_started_at, request_count
into v_window_started_at, v_request_count
from public.rsvp_api_rate_limits
where wedding_id = p_wedding_id
  and key_hash = p_key_hash
    for update;

if
not found then
        insert into public.rsvp_api_rate_limits (
            wedding_id, key_hash, window_started_at, request_count, updated_at
        ) values (
            p_wedding_id, p_key_hash, v_now, 1, v_now
        );

return 0;
end if;

    if
v_now >= v_window_started_at + make_interval(secs => p_window_seconds) then
update public.rsvp_api_rate_limits
set window_started_at = v_now,
    request_count     = 1,
    updated_at        = v_now
where wedding_id = p_wedding_id
  and key_hash = p_key_hash;

return 0;
end if;

    if
v_request_count >= p_limit then
        v_retry := greatest(
            1,
            ceil(extract(epoch from (
                v_window_started_at + make_interval(secs => p_window_seconds) - v_now
            )))::integer
        );

update public.rsvp_api_rate_limits
set updated_at = v_now
where wedding_id = p_wedding_id
  and key_hash = p_key_hash;

return v_retry;
end if;

update public.rsvp_api_rate_limits
set request_count = request_count + 1,
    updated_at    = v_now
where wedding_id = p_wedding_id
  and key_hash = p_key_hash;

return 0;
end;
$$;

revoke all on function public.consume_rsvp_rate_bucket(uuid, text, integer, integer)
    from public, anon, authenticated;
grant
execute
on
function
public
.
consume_rsvp_rate_bucket
(uuid, text, integer, integer)
    to service_role;

commit;
