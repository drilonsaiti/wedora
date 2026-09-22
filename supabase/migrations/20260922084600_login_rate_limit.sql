-- Login hardening: rate-limit repeated failed admin/couple login attempts.
--
-- Both login forms previously called supabase.auth.signInWithPassword()
-- directly from the browser, with no app-level limit on retries beyond
-- whatever Supabase's project-wide Auth rate limits already impose. This
-- adds a second, app-controlled layer, keyed by both the attempted email
-- and the caller's IP, so:
--   - a script hammering one email address (password guessing) gets
--     locked out after a handful of attempts, regardless of how many
--     different IPs it spreads across a single account, and
--   - a single IP hammering many different email addresses (credential
--     stuffing) gets locked out too, regardless of which account it's
--     trying.
--
-- This intentionally mirrors public.consume_rsvp_rate_bucket's shape and
-- locking strategy (supabase/migrations/20260920093000_rsvp_api.sql) --
-- same advisory-lock-then-upsert pattern, same "return 0 = allowed,
-- otherwise seconds until retry" contract -- just without the wedding_id
-- scoping, since login attempts aren't scoped to one wedding.

begin;

-- ============================================================
-- RATE LIMIT STATE (per rate-limit key -- see actions/auth.ts for how
-- the email-bucket and IP-bucket keys are built)
-- ============================================================

create table if not exists public.login_rate_limits (
                                                        key_hash text primary key,
                                                        window_started_at timestamptz not null default now(),
    request_count integer not null default 0 check (request_count >= 0),
    updated_at timestamptz not null default now()
    );

create index if not exists login_rate_limits_updated_at_idx
    on public.login_rate_limits (updated_at);

alter table public.login_rate_limits enable row level security;
revoke all on public.login_rate_limits from anon, authenticated;

-- ============================================================
-- RATE BUCKET CONSUMER
--
-- Returns 0 when allowed, otherwise the number of seconds until the
-- current window opens again. Mirrors
-- public.consume_rsvp_rate_bucket's locking strategy.
-- ============================================================

create or replace function public.consume_login_rate_bucket(
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
    v_window_started_at timestamptz;
    v_request_count integer;
    v_retry integer;
begin
    if p_key_hash is null or length(p_key_hash) < 16 then
        raise exception 'Invalid rate-limit key';
end if;

    if p_limit < 1 or p_window_seconds < 1 then
        raise exception 'Invalid rate-limit configuration';
end if;

    perform pg_advisory_xact_lock(
        hashtextextended('wedora:login-rate:' || p_key_hash, 0)
    );

delete from public.login_rate_limits
where updated_at < clock_timestamp() - interval '7 days';

select window_started_at, request_count
into v_window_started_at, v_request_count
from public.login_rate_limits
where key_hash = p_key_hash
    for update;

if not found then
        insert into public.login_rate_limits (
            key_hash, window_started_at, request_count, updated_at
        ) values (
            p_key_hash, v_now, 1, v_now
        );

return 0;
end if;

    if v_now >= v_window_started_at + make_interval(secs => p_window_seconds) then
update public.login_rate_limits
set window_started_at = v_now, request_count = 1, updated_at = v_now
where key_hash = p_key_hash;

return 0;
end if;

    if v_request_count >= p_limit then
        v_retry := greatest(
            1,
            ceil(extract(epoch from (
                v_window_started_at + make_interval(secs => p_window_seconds) - v_now
            )))::integer
        );

update public.login_rate_limits
set updated_at = v_now
where key_hash = p_key_hash;

return v_retry;
end if;

update public.login_rate_limits
set request_count = request_count + 1, updated_at = v_now
where key_hash = p_key_hash;

return 0;
end;
$$;

revoke all on function public.consume_login_rate_bucket(text, integer, integer)
    from public, anon, authenticated;
grant execute on function public.consume_login_rate_bucket(text, integer, integer)
    to service_role;

commit;