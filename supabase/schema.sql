-- ============================================
-- WEDDING PHOTOS - SUPABASE SQL SCHEMA
-- Run in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create
extension if not exists "uuid-ossp";

-- ============================================
-- EVENTS TABLE
-- ============================================
create table public.events
(
    id         uuid primary key     default uuid_generate_v4(),
    name       text        not null,
    date       date        not null,
    slug       text        not null unique,
    active     boolean     not null default true,
    created_at timestamptz not null default now()
);

-- ============================================
-- PHOTOS TABLE
-- ============================================
create table public.photos
(
    id                  uuid primary key     default uuid_generate_v4(),
    event_id            uuid        not null references public.events (id) on delete cascade,
    uploaded_by_session text        not null,
    guest_name          text,
    message             text,
    original_path       text        not null,
    thumbnail_path      text        not null,
    mime_type           text        not null,
    file_size           integer     not null,
    width               integer,
    height              integer,
    approved            boolean     not null default true,
    hidden              boolean     not null default false,
    favourite           boolean     not null default false,
    created_at          timestamptz not null default now()
);

create index photos_event_id_idx on public.photos (event_id);
create index photos_created_at_idx on public.photos (created_at desc);
create index photos_favourite_idx on public.photos (favourite) where favourite = true;

-- ============================================
-- ADMINS TABLE
-- ============================================
create table public.admins
(
    id         uuid primary key references auth.users (id) on delete cascade,
    email      text        not null unique,
    created_at timestamptz not null default now()
);

-- ============================================
-- INSERT DEFAULT EVENT
-- (Replace values with actual wedding details)
-- ============================================
insert into public.events (id, name, date, slug, active)
values ('YOUR-EVENT-UUID-HERE',
        'Sarah & James Wedding',
        '2025-06-14',
        'sarah-james-2025',
        true);

create table public.venue_elements
(
    id         uuid primary key default gen_random_uuid(),
    type       text    not null check (type in ('pool', 'couple_table', 'music', 'bar', 'toilet', 'entrance')),
    label      text,
    pos_x      integer not null default 100,
    pos_y      integer not null default 100,
    width      integer not null default 100,
    height     integer not null default 100,
    created_at timestamptz      default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.admins enable row level security;
alter table public.venue_elements enable row level security;

-- Helper function: is current user an admin?
create
or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
select exists (select 1
               from public.admins
               where id = auth.uid());
$$;

-- EVENTS policies
-- Public can read active events (needed to validate event_id on upload)
create
policy "Public can read active events"
  on public.events for
select
    using (active = true);

-- Admins can do anything with events
create
policy "Admins can manage events"
  on public.events for all
  using (public.is_admin());

-- VENUE_ELEMENTS policies
-- Public can read venue elements
create
policy "Public can read venue elements"
  on public.venue_elements for
select
    using (true);

-- Admins can manage venue elements
create
policy "Admins can manage venue elements"
  on public.venue_elements for all
  using (public.is_admin());

-- PHOTOS policies
-- Public (anonymous) can INSERT only — no SELECT
create
policy "Public can insert photos"
  on public.photos for insert
  with check (
    exists (
      select 1 from public.events
      where id = event_id and active = true
    )
  );

-- Admins can read all photos
create
policy "Admins can read all photos"
  on public.photos for
select
    using (public.is_admin());

-- Admins can update photos (approve, hide, favourite)
create
policy "Admins can update photos"
  on public.photos for
update
    using (public.is_admin());

-- Admins can delete photos
create
policy "Admins can delete photos"
  on public.photos for delete
using (public.is_admin());

-- ADMINS policies
-- Admins can read admin table (to verify own status)
create
policy "Admins can read admins"
  on public.admins for
select
    using (public.is_admin() or id = auth.uid());

-- ============================================
-- STORAGE BUCKETS
-- (Run after creating buckets in Supabase UI)
-- ============================================

-- Create buckets via Supabase UI or API:
-- Bucket: "photos" (private)
-- Bucket: "thumbnails" (private)

-- Storage policies for "photos" bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos',
        'photos',
        false,
        10485760, -- 10MB
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails',
        'thumbnails',
        false,
        2097152, -- 2MB
        array['image/jpeg', 'image/webp']) on conflict (id) do nothing;

-- Storage RLS: photos bucket
-- Anyone can upload (INSERT) to photos/
create
policy "Public can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos');

-- Only admins can read photos
create
policy "Admins can read photos"
  on storage.objects for
select
    using (
    bucket_id = 'photos'
    and exists (
    select 1 from public.admins where id = auth.uid()
    )
    );

-- Only admins can delete photos
create
policy "Admins can delete photos"
  on storage.objects for delete
using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.admins where id = auth.uid()
    )
  );

-- Storage RLS: thumbnails bucket
create
policy "Public can upload thumbnails"
  on storage.objects for insert
  with check (bucket_id = 'thumbnails');

create
policy "Admins can read thumbnails"
  on storage.objects for
select
    using (
    bucket_id = 'thumbnails'
    and exists (
    select 1 from public.admins where id = auth.uid()
    )
    );

create
policy "Admins can delete thumbnails"
  on storage.objects for delete
using (
    bucket_id = 'thumbnails'
    and exists (
      select 1 from public.admins where id = auth.uid()
    )
  );
