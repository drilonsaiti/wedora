-- ============================================
-- ADDITIONS TO supabase/schema.sql
-- Run these in Supabase SQL Editor
-- ============================================

-- Gallery share tokens (for public slideshow links)
create table public.gallery_tokens
(
    id            uuid primary key            default uuid_generate_v4(),
    event_id      uuid        not null references public.events (id) on delete cascade,
    token         text        not null unique default encode(gen_random_bytes(24), 'base64url'),
    label         text,        -- e.g. "Shared with guests June 2025"
    show_hidden   boolean     not null        default false,
    show_messages boolean     not null        default true,
    expires_at    timestamptz, -- null = never expires
    created_by    uuid references auth.users (id),
    created_at    timestamptz not null        default now()
);

create index gallery_tokens_token_idx on public.gallery_tokens (token);

alter table public.gallery_tokens enable row level security;

-- Only admins can create/read/delete tokens
create
policy "Admins can manage gallery tokens"
  on public.gallery_tokens for all
  using (public.is_admin());

-- Public can SELECT a token by token value (to validate it when loading gallery)
create
policy "Public can read valid gallery tokens"
  on public.gallery_tokens for
select
    using (
    expires_at is null or expires_at > now()
    );

-- ============================================
-- New storage policy: gallery signed-URL access
-- The gallery route uses service role to generate
-- signed URLs server-side, so no extra bucket policy
-- is needed. Existing admin-only bucket policies remain.
-- ============================================
