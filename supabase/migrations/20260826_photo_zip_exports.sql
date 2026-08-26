-- Wedora: queued photo ZIP exports
-- Apply once in Supabase SQL editor before deploying the queued ZIP routes.

create extension if not exists pgcrypto;

create table if not exists public.photo_zip_exports (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid not null references public.weddings(id) on delete cascade,
    requested_by uuid not null references auth.users(id) on delete cascade,
    filter text not null default 'all'
        check (filter in ('all', 'favourites')),
    status text not null default 'queued'
        check (status in ('queued', 'processing', 'ready', 'failed')),
    requested_photo_count integer not null default 0
        check (requested_photo_count >= 0),
    archive_photo_count integer
        check (archive_photo_count is null or archive_photo_count >= 0),
    storage_path text,
    error_code text,
    error_detail text,
    attempts integer not null default 0
        check (attempts >= 0),
    created_at timestamptz not null default now(),
    started_at timestamptz,
    heartbeat_at timestamptz,
    completed_at timestamptz,
    expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists photo_zip_exports_wedding_idx
    on public.photo_zip_exports (wedding_id, created_at desc);

create index if not exists photo_zip_exports_status_idx
    on public.photo_zip_exports (status, created_at);

create index if not exists photo_zip_exports_expiry_idx
    on public.photo_zip_exports (expires_at)
    where status = 'ready';

-- Prevent duplicate queued/processing jobs for the same user/wedding/filter.
create unique index if not exists photo_zip_exports_active_unique
    on public.photo_zip_exports (wedding_id, requested_by, filter)
    where status in ('queued', 'processing');

alter table public.photo_zip_exports enable row level security;

-- No anon/authenticated policies are intentionally created.
-- All queue access goes through exact server-side authorization and the service role.

insert into storage.buckets (
    id,
    name,
    public
)
values (
    'photo-exports',
    'photo-exports',
    false
)
on conflict (id) do update
set public = excluded.public;

-- Atomically recover stale jobs and claim one queued job.
create or replace function public.claim_photo_zip_export()
returns setof public.photo_zip_exports
language plpgsql
security definer
set search_path = public
as $$
declare
    job public.photo_zip_exports;
begin
    -- Recover jobs whose worker disappeared.
    update public.photo_zip_exports
    set
        status = case
            when attempts >= 3 then 'failed'
            else 'queued'
        end,
        error_code = case
            when attempts >= 3 then 'WORKER_TIMEOUT'
            else error_code
        end,
        error_detail = case
            when attempts >= 3 then 'Worker lease expired too many times'
            else error_detail
        end,
        heartbeat_at = null
    where
        status = 'processing'
        and heartbeat_at is not null
        and heartbeat_at < now() - interval '20 minutes';

    select *
    into job
    from public.photo_zip_exports
    where
        status = 'queued'
        and attempts < 3
        and expires_at > now()
    order by created_at asc
    for update skip locked
    limit 1;

    if not found then
        return;
    end if;

    update public.photo_zip_exports
    set
        status = 'processing',
        attempts = attempts + 1,
        started_at = coalesce(started_at, now()),
        heartbeat_at = now(),
        error_code = null,
        error_detail = null
    where id = job.id
    returning * into job;

    return next job;
end;
$$;

revoke all on function public.claim_photo_zip_export() from public;
revoke all on function public.claim_photo_zip_export() from anon;
revoke all on function public.claim_photo_zip_export() from authenticated;
grant execute on function public.claim_photo_zip_export() to service_role;
