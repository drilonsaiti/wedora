-- Wedora photo upload hardening
-- 1) durable server-side rate limiting
-- 2) atomic final photo limit enforcement
-- 3) crash-recoverable storage cleanup markers

begin;

-- ============================================================
-- RATE LIMIT STATE
-- ============================================================

create table if not exists public.photo_upload_rate_limits
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
    scope text not null check
(
    scope
    in
(
    'session',
    'ip'
)),
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
    scope,
    key_hash
)
    );

create index if not exists photo_upload_rate_limits_updated_at_idx
    on public.photo_upload_rate_limits(updated_at);

create index if not exists photo_upload_rate_limits_wedding_updated_at_idx
    on public.photo_upload_rate_limits(wedding_id, updated_at);

alter table public.photo_upload_rate_limits enable row level security;
revoke all on public.photo_upload_rate_limits from anon, authenticated;

-- ============================================================
-- CLEANUP MARKERS
--
-- A marker is written BEFORE storage upload begins. If the server
-- process dies midway, a later upload can safely recover the orphan.
-- If the photo was committed successfully, stale cleanup processing
-- removes only the marker and never deletes the valid storage files.
-- ============================================================

create table if not exists public.photo_upload_cleanup_jobs
(
    photo_id
    uuid
    primary
    key,
    original_path
    text
    not
    null,
    thumbnail_path
    text
    not
    null,
    created_at
    timestamptz
    not
    null
    default
    now
(
),
    updated_at timestamptz not null default now
(
),
    attempts integer not null default 0 check
(
    attempts
    >=
    0
),
    last_error text
    );

create index if not exists photo_upload_cleanup_jobs_created_at_idx
    on public.photo_upload_cleanup_jobs(created_at);

alter table public.photo_upload_cleanup_jobs enable row level security;
revoke all on public.photo_upload_cleanup_jobs from anon, authenticated;

-- ============================================================
-- INTERNAL RATE BUCKET CONSUMER
--
-- Returns 0 when allowed, otherwise the number of seconds until
-- the current window opens again.
-- ============================================================

create
or replace function public.consume_photo_upload_rate_bucket(
    p_wedding_id uuid,
    p_scope text,
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
p_scope not in ('session', 'ip') then
        raise exception 'Invalid rate-limit scope';
end if;

    if
p_key_hash is null or length(p_key_hash) < 16 then
        raise exception 'Invalid rate-limit key';
end if;

    if
p_limit < 1 or p_window_seconds < 1 then
        raise exception 'Invalid rate-limit configuration';
end if;

    -- Serialize this exact bucket even when several requests arrive
    -- concurrently from the same browser/IP.
    perform
pg_advisory_xact_lock(
        hashtextextended(
            'wedora:photo-rate:' ||
            p_wedding_id::text || ':' ||
            p_scope || ':' ||
            p_key_hash,
            0
        )
    );

select window_started_at,
       request_count
into
    v_window_started_at,
    v_request_count
from public.photo_upload_rate_limits
where wedding_id = p_wedding_id
  and scope = p_scope
  and key_hash = p_key_hash
    for update;

if
not found then
        insert into public.photo_upload_rate_limits (
            wedding_id,
            scope,
            key_hash,
            window_started_at,
            request_count,
            updated_at
        ) values (
            p_wedding_id,
            p_scope,
            p_key_hash,
            v_now,
            1,
            v_now
        );

return 0;
end if;

    if
v_now >= v_window_started_at + make_interval(secs => p_window_seconds) then
update public.photo_upload_rate_limits
set window_started_at = v_now,
    request_count     = 1,
    updated_at        = v_now
where wedding_id = p_wedding_id
  and scope = p_scope
  and key_hash = p_key_hash;

return 0;
end if;

    if
v_request_count >= p_limit then
        v_retry := greatest(
            1,
            ceil(
                extract(
                    epoch from (
                        v_window_started_at + make_interval(secs => p_window_seconds) - v_now
                    )
                )
            )::integer
        );

update public.photo_upload_rate_limits
set updated_at = v_now
where wedding_id = p_wedding_id
  and scope = p_scope
  and key_hash = p_key_hash;

return v_retry;
end if;

update public.photo_upload_rate_limits
set request_count = request_count + 1,
    updated_at    = v_now
where wedding_id = p_wedding_id
  and scope = p_scope
  and key_hash = p_key_hash;

return 0;
end;
$$;

-- ============================================================
-- GUEST UPLOAD PREFLIGHT
--
-- Validates event/wedding/settings, performs early limit checks,
-- and atomically consumes server-side session/IP rate buckets.
-- Final limits are checked again by finalize_guest_photo_upload().
-- ============================================================

create
or replace function public.begin_guest_photo_upload(
    p_event_id uuid,
    p_session_id text,
    p_session_key_hash text,
    p_ip_key_hash text default null,
    p_session_limit integer default 5,
    p_ip_limit integer default 30,
    p_window_seconds integer default 60
)
returns table (
    ok boolean,
    wedding_id uuid,
    code text,
    retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
v_wedding_id uuid;
    v_enable_photo_upload
boolean;
    v_max_photos_total
integer;
    v_max_photos_per_guest
integer;
    v_total_count
bigint;
    v_session_count
bigint;
    v_retry
integer;
begin
    if
p_session_id is null or length(trim(p_session_id)) < 8 then
        return query
select false, null::uuid, 'INVALID_FILE'::text, null::integer;
return;
end if;

select e.wedding_id,
       ws.enable_photo_upload,
       ws.max_photos_total,
       ws.max_photos_per_guest
into
    v_wedding_id,
    v_enable_photo_upload,
    v_max_photos_total,
    v_max_photos_per_guest
from public.events e
         left join public.wedding_settings ws
                   on ws.wedding_id = e.wedding_id
where e.id = p_event_id;

if
not found or v_wedding_id is null then
        return query
select false, null::uuid, 'INVALID_EVENT'::text, null::integer;
return;
end if;

    if
coalesce(v_enable_photo_upload, false) = false then
        return query
select false, v_wedding_id, 'UPLOAD_DISABLED'::text, null::integer;
return;
end if;

    -- Keep the limiter table bounded without needing a separate cron.
    -- Only old buckets for this wedding are touched.
delete
from public.photo_upload_rate_limits
where wedding_id = v_wedding_id
  and updated_at < clock_timestamp() - interval '7 days';

-- Fast pre-checks. These improve UX, but the authoritative,
-- concurrency-safe checks happen again during finalization.
if
v_max_photos_total is not null then
select count(*)
into v_total_count
from public.photos
where wedding_id = v_wedding_id;

if
v_total_count >= v_max_photos_total then
            return query
select false, v_wedding_id, 'WEDDING_LIMIT_REACHED'::text, null::integer;
return;
end if;
end if;

    if
v_max_photos_per_guest is not null then
select count(*)
into v_session_count
from public.photos
where wedding_id = v_wedding_id
  and uploaded_by_session = p_session_id;

if
v_session_count >= v_max_photos_per_guest then
            return query
select false, v_wedding_id, 'PHOTO_LIMIT_REACHED'::text, null::integer;
return;
end if;
end if;

    v_retry
:= public.consume_photo_upload_rate_bucket(
        v_wedding_id,
        'session',
        p_session_key_hash,
        p_session_limit,
        p_window_seconds
    );

    if
v_retry > 0 then
        return query
select false, v_wedding_id, 'RATE_LIMITED'::text, v_retry;
return;
end if;

    if
p_ip_key_hash is not null then
        v_retry := public.consume_photo_upload_rate_bucket(
            v_wedding_id,
            'ip',
            p_ip_key_hash,
            p_ip_limit,
            p_window_seconds
        );

        if
v_retry > 0 then
            return query
select false, v_wedding_id, 'RATE_LIMITED'::text, v_retry;
return;
end if;
end if;

return query select true, v_wedding_id, null::text, null::integer;
end;
$$;

-- ============================================================
-- ATOMIC FINALIZATION
--
-- All guest finalizations for one wedding share the same advisory
-- lock. This prevents two concurrent requests from both slipping
-- past total/per-session limits.
-- ============================================================

create
or replace function public.finalize_guest_photo_upload(
    p_photo_id uuid,
    p_event_id uuid,
    p_wedding_id uuid,
    p_session_id text,
    p_guest_name text,
    p_message text,
    p_original_path text,
    p_thumbnail_path text,
    p_file_size bigint,
    p_width integer,
    p_height integer,
    p_is_public boolean
)
returns table (
    ok boolean,
    code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
v_event_wedding_id uuid;
    v_enable_photo_upload
boolean;
    v_max_photos_total
integer;
    v_max_photos_per_guest
integer;
    v_total_count
bigint;
    v_session_count
bigint;
begin
    perform
pg_advisory_xact_lock(
        hashtextextended(
            'wedora:photo-finalize:' || p_wedding_id::text,
            0
        )
    );

select wedding_id
into v_event_wedding_id
from public.events
where id = p_event_id;

if
not found or v_event_wedding_id is distinct from p_wedding_id then
        return query
select false, 'INVALID_EVENT'::text;
return;
end if;

select enable_photo_upload,
       max_photos_total,
       max_photos_per_guest
into
    v_enable_photo_upload,
    v_max_photos_total,
    v_max_photos_per_guest
from public.wedding_settings
where wedding_id = p_wedding_id;

if
not found or coalesce(v_enable_photo_upload, false) = false then
        return query
select false, 'UPLOAD_DISABLED'::text;
return;
end if;

    if
v_max_photos_total is not null then
select count(*)
into v_total_count
from public.photos
where wedding_id = p_wedding_id;

if
v_total_count >= v_max_photos_total then
            return query
select false, 'WEDDING_LIMIT_REACHED'::text;
return;
end if;
end if;

    if
v_max_photos_per_guest is not null then
select count(*)
into v_session_count
from public.photos
where wedding_id = p_wedding_id
  and uploaded_by_session = p_session_id;

if
v_session_count >= v_max_photos_per_guest then
            return query
select false, 'PHOTO_LIMIT_REACHED'::text;
return;
end if;
end if;

insert into public.photos (id,
                           event_id,
                           wedding_id,
                           uploaded_by_session,
                           guest_name,
                           message,
                           original_path,
                           thumbnail_path,
                           mime_type,
                           file_size,
                           width,
                           height,
                           approved,
                           hidden,
                           favourite,
                           is_public)
values (p_photo_id,
        p_event_id,
        p_wedding_id,
        p_session_id,
        p_guest_name,
        p_message,
        p_original_path,
        p_thumbnail_path,
        'image/webp',
        p_file_size,
        p_width,
        p_height,
        false,
        false,
        false,
        p_is_public);

return query select true, null::text;
end;
$$;

-- ============================================================
-- CLEANUP MARKER RPCS
-- ============================================================

create
or replace function public.register_photo_upload_cleanup_job(
    p_photo_id uuid,
    p_original_path text,
    p_thumbnail_path text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
insert into public.photo_upload_cleanup_jobs (photo_id,
                                              original_path,
                                              thumbnail_path)
values (p_photo_id,
        p_original_path,
        p_thumbnail_path);
end;
$$;

create
or replace function public.complete_photo_upload_cleanup_job(
    p_photo_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
delete
from public.photo_upload_cleanup_jobs
where photo_id = p_photo_id;
end;
$$;

create
or replace function public.get_stale_photo_upload_cleanup_jobs(
    p_limit integer default 10,
    p_older_than_seconds integer default 600
)
returns table (
    photo_id uuid,
    original_path text,
    thumbnail_path text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    -- A marker may remain after a successful commit if the process died
    -- before it could remove the marker. Never delete files for a photo
    -- that now exists in the canonical photos table.
delete
from public.photo_upload_cleanup_jobs j
where exists (select 1
              from public.photos p
              where p.id = j.photo_id);

return query
select j.photo_id,
       j.original_path,
       j.thumbnail_path
from public.photo_upload_cleanup_jobs j
where j.created_at <= clock_timestamp() - make_interval(secs = > greatest(p_older_than_seconds, 60))
order by j.created_at asc limit greatest(1, least(p_limit, 50));
end;
$$;

create
or replace function public.mark_photo_upload_cleanup_failed(
    p_photo_id uuid,
    p_error text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
update public.photo_upload_cleanup_jobs
set attempts   = attempts + 1,
    last_error = left (coalesce (p_error, 'Unknown cleanup error'), 1000), updated_at = clock_timestamp()
where photo_id = p_photo_id;
end;
$$;

-- ============================================================
-- LOCK DOWN RPCS
-- ============================================================

revoke all on function public.consume_photo_upload_rate_bucket(uuid, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.begin_guest_photo_upload(uuid, text, text, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.finalize_guest_photo_upload(uuid, uuid, uuid, text, text, text, text, text, bigint, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.register_photo_upload_cleanup_job(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_photo_upload_cleanup_job(uuid) from public, anon, authenticated;
revoke all on function public.get_stale_photo_upload_cleanup_jobs(integer, integer) from public, anon, authenticated;
revoke all on function public.mark_photo_upload_cleanup_failed(uuid, text) from public, anon, authenticated;

grant
execute
on
function
public
.
begin_guest_photo_upload
(uuid, text, text, text, integer, integer, integer) to service_role;
grant execute on function public.finalize_guest_photo_upload
(uuid, uuid, uuid, text, text, text, text, text, bigint, integer, integer, boolean) to service_role;
grant execute on function public.register_photo_upload_cleanup_job
(uuid, text, text) to service_role;
grant execute on function public.complete_photo_upload_cleanup_job
(uuid) to service_role;
grant execute on function public.get_stale_photo_upload_cleanup_jobs
(integer, integer) to service_role;
grant execute on function public.mark_photo_upload_cleanup_failed
(uuid, text) to service_role;

commit;
