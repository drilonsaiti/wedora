-- ============================================
-- GUEST SEATING MANAGEMENT SCHEMA
-- ============================================

-- Tables Table
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  seats integer not null check (seats > 0),
  pos_x float not null default 0,
  pos_y float not null default 0,
  created_at timestamptz not null default now()
);

-- Guests Table
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  initials text not null,
  table_id uuid references public.tables(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indices
create index guests_table_id_idx on public.guests(table_id);
create index guests_names_idx on public.guests(first_name, last_name);

-- RLS
alter table public.tables enable row level security;
alter table public.guests enable row level security;

-- Policies for TABLES
-- Public can read tables (needed for guest app)
create policy "Public can read tables"
  on public.tables for select
  using (true);

-- Admins can manage tables
create policy "Admins can manage tables"
  on public.tables for all
  using (public.is_admin());

-- Policies for GUESTS
-- Public can read guests (needed for guest app search)
create policy "Public can read guests"
  on public.guests for select
  using (true);

-- Admins can manage guests
create policy "Admins can manage guests"
  on public.guests for all
  using (public.is_admin());

-- Function to generate initials
create or replace function public.generate_initials(first_name text, last_name text)
returns text
language plpgsql
as $$
begin
  return upper(substring(first_name from 1 for 1) || substring(last_name from 1 for 1));
end;
$$;

-- Trigger to automatically set initials on insert or update
create or replace function public.handle_guest_initials()
returns trigger
language plpgsql
as $$
begin
  new.initials := public.generate_initials(new.first_name, new.last_name);
  return new;
end;
$$;

create trigger guest_initials_trigger
before insert or update of first_name, last_name
on public.guests
for each row
execute function public.handle_guest_initials();
