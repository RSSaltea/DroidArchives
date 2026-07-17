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
drop policy if exists "Report owners can read own" on public.galactic_reports;
drop policy if exists "Admins can manage reports" on public.galactic_reports;
drop policy if exists "Mods can read all reports" on public.galactic_reports;
drop policy if exists "Admins can manage mods" on public.galactic_report_mods;
drop policy if exists "Mods can read own mod row" on public.galactic_report_mods;

create policy "Report owners can insert"
on public.galactic_reports
for insert
with check (
  auth.uid() = user_id
  and lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "Report owners can read own"
on public.galactic_reports
for select
using (auth.uid() = user_id);

create policy "Admins can manage reports"
on public.galactic_reports
for all
using (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com');

create policy "Mods can read all reports"
on public.galactic_reports
for select
using (
  exists (
    select 1
    from public.galactic_report_mods mods
    where lower(mods.email) = lower(auth.jwt() ->> 'email')
  )
);

create policy "Admins can manage mods"
on public.galactic_report_mods
for all
using (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com');

create policy "Mods can read own mod row"
on public.galactic_report_mods
for select
using (
  lower(email) = lower(auth.jwt() ->> 'email')
  or lower(auth.jwt() ->> 'email') = 'xraffo@gmail.com'
);

