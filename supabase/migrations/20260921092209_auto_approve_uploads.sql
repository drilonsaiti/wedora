-- ============================================================
-- MODERATION-HOLD-BEFORE-LIVE TOGGLE
-- ============================================================
--
-- Every wedding has always been fully moderated: photos.approved defaults
-- to false and the public gallery only ever shows approved = true rows,
-- with no way to change that per wedding. This adds an opt-in per-wedding
-- setting to skip that hold and publish guest uploads immediately -- for
-- couples who want a real-time "photo wall" feel during the reception --
-- while leaving the current always-moderated behavior as the default for
-- everyone who doesn't turn it on.

alter table public.wedding_settings
    add column if not exists auto_approve_uploads boolean not null default false;

-- finalize_guest_photo_upload() is the SECURITY DEFINER RPC that actually
-- inserts the photos row (see 20260825_photo_upload_hardening.sql); it
-- previously hardcoded `approved = false`. Re-create it with the same
-- signature (so the existing revoke/grant to service_role keeps applying)
-- and read auto_approve_uploads from wedding_settings instead.
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
    v_auto_approve_uploads
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
       coalesce(auto_approve_uploads, false),
       max_photos_total,
       max_photos_per_guest
into
    v_enable_photo_upload,
    v_auto_approve_uploads,
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
        v_auto_approve_uploads,
        false,
        false,
        p_is_public);

return query select true, null::text;
end;
$$;