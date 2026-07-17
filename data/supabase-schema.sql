-- Droid Archives Supabase setup
-- Run this in Supabase SQL Editor, then put your Project URL and anon public key
-- in data/supabase-config.json.

create table if not exists public.droid_archive_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  profiles jsonb not null default '[]'::jsonb,
  active_profile_id text,
  ui jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.droid_archive_profiles enable row level security;

drop policy if exists "Users can read their own Droid Archives save" on public.droid_archive_profiles;
create policy "Users can read their own Droid Archives save"
on public.droid_archive_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Droid Archives save" on public.droid_archive_profiles;
create policy "Users can insert their own Droid Archives save"
on public.droid_archive_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Droid Archives save" on public.droid_archive_profiles;
create policy "Users can update their own Droid Archives save"
on public.droid_archive_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own Droid Archives save" on public.droid_archive_profiles;
create policy "Users can delete their own Droid Archives save"
on public.droid_archive_profiles
for delete
to authenticated
using (auth.uid() = user_id);

create extension if not exists pgcrypto;

create table if not exists public.galactic_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  droid_name text not null,
  droid_type text not null check (droid_type in ('WORKER','ASTROMECH','BATTLE')),
  report_kind text not null check (report_kind in ('buy_cost','earn_amount')),
  value_raw text not null,
  value numeric not null check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.galactic_report_mods (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.galactic_reports enable row level security;
alter table public.galactic_report_mods enable row level security;

drop policy if exists "Report owners can insert" on public.galactic_reports;
create policy "Report owners can insert"
on public.galactic_reports
for insert
to authenticated
with check (
  auth.uid() = user_id
  and lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Report owners can read own" on public.galactic_reports;
create policy "Report owners can read own"
on public.galactic_reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can manage reports" on public.galactic_reports;
create policy "Admins can manage reports"
on public.galactic_reports
for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com');

drop policy if exists "Mods can read all reports" on public.galactic_reports;
create policy "Mods can read all reports"
on public.galactic_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.galactic_report_mods mods
    where lower(mods.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can manage mods" on public.galactic_report_mods;
create policy "Admins can manage mods"
on public.galactic_report_mods
for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com');

drop policy if exists "Mods can read own mod row" on public.galactic_report_mods;
create policy "Mods can read own mod row"
on public.galactic_report_mods
for select
to authenticated
using (
  lower(email) = lower(auth.jwt() ->> 'email')
  or lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com'
);
