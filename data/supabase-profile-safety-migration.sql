-- Droid Archives cloud profile safety migration
-- Run this entire file once in the Supabase SQL Editor before deploying the
-- matching app.js. It is safe to run again.

begin;

alter table public.droid_archive_profiles
  add column if not exists revision bigint not null default 1;

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

drop policy if exists "Users can read their own Droid Archives history"
  on public.droid_archive_profile_history;

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

drop trigger if exists archive_droid_profile_document_trigger
  on public.droid_archive_profiles;

create trigger archive_droid_profile_document_trigger
before update or delete on public.droid_archive_profiles
for each row
execute function public.archive_droid_profile_document();

-- Preserve the current document immediately. This protects profiles rebuilt
-- before this migration was installed, even if no later update occurs.
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

commit;

-- Verification:
-- select user_id, revision, jsonb_array_length(profiles) as profile_count, updated_at
-- from public.droid_archive_profiles;
--
-- select user_id, revision, operation, archived_at
-- from public.droid_archive_profile_history
-- order by archived_at desc;
