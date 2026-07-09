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
