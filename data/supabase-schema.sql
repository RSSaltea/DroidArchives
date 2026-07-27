-- Droid Archives Supabase setup
-- Run this in Supabase SQL Editor, then put your Project URL and anon public key
-- in data/supabase-config.json.

create table if not exists public.droid_archive_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  profiles jsonb not null default '[]'::jsonb,
  active_profile_id text,
  ui jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.droid_archive_profiles
  add column if not exists revision bigint not null default 1;

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

-- Keep the complete previous document before every cloud update or deletion.
-- The application uses revision as an optimistic lock, so stale tabs cannot
-- overwrite a newer profile collection.
create table if not exists public.droid_archive_profile_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profiles jsonb not null,
  active_profile_id text,
  ui jsonb not null default '{}'::jsonb,
  revision bigint not null,
  operation text not null check (operation in ('baseline', 'update', 'delete')),
  archived_at timestamptz not null default now()
);

create index if not exists droid_archive_profile_history_user_time_idx
  on public.droid_archive_profile_history (user_id, archived_at desc);

alter table public.droid_archive_profile_history enable row level security;

drop policy if exists "Users can read their own Droid Archives history" on public.droid_archive_profile_history;
create policy "Users can read their own Droid Archives history"
on public.droid_archive_profile_history
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.archive_droid_profile_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.droid_archive_profile_history (
    user_id,
    profiles,
    active_profile_id,
    ui,
    revision,
    operation,
    archived_at
  )
  values (
    old.user_id,
    old.profiles,
    old.active_profile_id,
    old.ui,
    old.revision,
    lower(tg_op),
    now()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists archive_droid_profile_document_trigger on public.droid_archive_profiles;
create trigger archive_droid_profile_document_trigger
before update or delete on public.droid_archive_profiles
for each row
execute function public.archive_droid_profile_document();

insert into public.droid_archive_profile_history (
  user_id,
  profiles,
  active_profile_id,
  ui,
  revision,
  operation
)
select
  source_row.user_id,
  source_row.profiles,
  source_row.active_profile_id,
  source_row.ui,
  source_row.revision,
  'baseline'
from public.droid_archive_profiles as source_row
where jsonb_array_length(source_row.profiles) > 0
  and not exists (
    select 1
    from public.droid_archive_profile_history as history
    where history.user_id = source_row.user_id
      and history.operation = 'baseline'
      and history.revision = source_row.revision
  );

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
  screenshot_url text,
  report_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.galactic_reports
  add column if not exists screenshot_url text,
  add column if not exists report_group_id uuid;

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
