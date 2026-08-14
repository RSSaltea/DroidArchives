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

-- Account groups -----------------------------------------------------------
-- Profiles remain inside each owner's protected droid_archive_profiles row.
-- Group members can only receive profiles explicitly listed in
-- droid_archive_group_profile_shares through the security-definer workspace
-- function below. This prevents a share from exposing the owner's other
-- profiles in the same JSON document.

create table if not exists public.droid_archive_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.droid_archive_group_members (
  group_id uuid not null references public.droid_archive_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.droid_archive_group_profile_shares (
  group_id uuid not null references public.droid_archive_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  can_edit boolean not null default false,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, owner_id, profile_id),
  foreign key (group_id, owner_id)
    references public.droid_archive_group_members(group_id, user_id)
    on delete cascade
);

create index if not exists droid_archive_group_members_user_idx
  on public.droid_archive_group_members(user_id);

create index if not exists droid_archive_group_shares_owner_idx
  on public.droid_archive_group_profile_shares(owner_id, profile_id);

alter table public.droid_archive_groups enable row level security;
alter table public.droid_archive_group_members enable row level security;
alter table public.droid_archive_group_profile_shares enable row level security;

create or replace function public.is_droid_archive_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.droid_archive_group_members member
    where member.group_id = target_group_id
      and member.user_id = auth.uid()
  );
$$;

revoke all on function public.is_droid_archive_group_member(uuid) from public;
grant execute on function public.is_droid_archive_group_member(uuid) to authenticated;

drop policy if exists "Group members can read their groups" on public.droid_archive_groups;
create policy "Group members can read their groups"
on public.droid_archive_groups
for select
to authenticated
using (public.is_droid_archive_group_member(id));

drop policy if exists "Group owners can update their groups" on public.droid_archive_groups;
create policy "Group owners can update their groups"
on public.droid_archive_groups
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Group owners can delete their groups" on public.droid_archive_groups;
create policy "Group owners can delete their groups"
on public.droid_archive_groups
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Group members can read memberships" on public.droid_archive_group_members;
create policy "Group members can read memberships"
on public.droid_archive_group_members
for select
to authenticated
using (public.is_droid_archive_group_member(group_id));

drop policy if exists "Members can leave or owners can remove members" on public.droid_archive_group_members;
create policy "Members can leave or owners can remove members"
on public.droid_archive_group_members
for delete
to authenticated
using (
  (user_id = auth.uid() and role = 'member')
  or exists (
    select 1
    from public.droid_archive_groups target_group
    where target_group.id = group_id
      and target_group.owner_id = auth.uid()
      and user_id <> auth.uid()
  )
);

drop policy if exists "Group members can read profile share metadata" on public.droid_archive_group_profile_shares;
create policy "Group members can read profile share metadata"
on public.droid_archive_group_profile_shares
for select
to authenticated
using (public.is_droid_archive_group_member(group_id));

drop policy if exists "Owners can manage their profile shares" on public.droid_archive_group_profile_shares;
create policy "Owners can manage their profile shares"
on public.droid_archive_group_profile_shares
for all
to authenticated
using (owner_id = auth.uid() and public.is_droid_archive_group_member(group_id))
with check (owner_id = auth.uid() and public.is_droid_archive_group_member(group_id));

create or replace function public.create_droid_archive_group(
  group_name text,
  member_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if char_length(trim(group_name)) not between 1 and 60 then
    raise exception 'Group name must be between 1 and 60 characters.';
  end if;

  if char_length(trim(member_display_name)) not between 1 and 40 then
    raise exception 'Display name must be between 1 and 40 characters.';
  end if;

  insert into public.droid_archive_groups (name, owner_id)
  values (trim(group_name), auth.uid())
  returning id into new_group_id;

  insert into public.droid_archive_group_members (group_id, user_id, display_name, role)
  values (new_group_id, auth.uid(), trim(member_display_name), 'owner');

  return new_group_id;
end;
$$;

create or replace function public.join_droid_archive_group(
  supplied_invite_code text,
  member_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if char_length(trim(member_display_name)) not between 1 and 40 then
    raise exception 'Display name must be between 1 and 40 characters.';
  end if;

  select target_group.id
  into target_group_id
  from public.droid_archive_groups target_group
  where upper(target_group.invite_code) = upper(trim(supplied_invite_code));

  if target_group_id is null then
    raise exception 'That invite code is invalid.';
  end if;

  insert into public.droid_archive_group_members (group_id, user_id, display_name, role)
  values (target_group_id, auth.uid(), trim(member_display_name), 'member')
  on conflict (group_id, user_id)
  do update set display_name = excluded.display_name;

  return target_group_id;
end;
$$;

create or replace function public.set_droid_archive_profile_share(
  target_group_id uuid,
  target_profile_id text,
  should_share boolean,
  allow_edit boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_droid_archive_group_member(target_group_id) then
    raise exception 'You are not a member of this group.';
  end if;

  if not exists (
    select 1
    from public.droid_archive_profiles owner_profiles,
         jsonb_array_elements(owner_profiles.profiles) profile
    where owner_profiles.user_id = auth.uid()
      and profile ->> 'id' = target_profile_id
  ) then
    raise exception 'That profile does not belong to your account.';
  end if;

  if should_share then
    insert into public.droid_archive_group_profile_shares (
      group_id,
      owner_id,
      profile_id,
      can_edit,
      updated_at
    )
    values (target_group_id, auth.uid(), target_profile_id, allow_edit, now())
    on conflict (group_id, owner_id, profile_id)
    do update set can_edit = excluded.can_edit, updated_at = now();
  else
    delete from public.droid_archive_group_profile_shares
    where group_id = target_group_id
      and owner_id = auth.uid()
      and profile_id = target_profile_id;
  end if;
end;
$$;

create or replace function public.droid_archive_group_workspace()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(group_document order by group_document ->> 'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', target_group.id,
      'name', target_group.name,
      'ownerId', target_group.owner_id,
      'inviteCode', target_group.invite_code,
      'createdAt', target_group.created_at,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'userId', member.user_id,
          'displayName', member.display_name,
          'role', member.role,
          'joinedAt', member.joined_at
        ) order by member.role desc, lower(member.display_name))
        from public.droid_archive_group_members member
        where member.group_id = target_group.id
      ), '[]'::jsonb),
      'profiles', coalesce((
        select jsonb_agg(jsonb_build_object(
          'ownerId', profile_share.owner_id,
          'ownerName', owner_member.display_name,
          'profileId', profile ->> 'id',
          'profileName', coalesce(profile ->> 'name', 'Profile'),
          'updatedAt', profile ->> 'updatedAt',
          'canEdit', profile_share.can_edit,
          'data', profile -> 'data'
        ) order by lower(owner_member.display_name), lower(coalesce(profile ->> 'name', 'Profile')))
        from public.droid_archive_group_profile_shares profile_share
        join public.droid_archive_group_members owner_member
          on owner_member.group_id = profile_share.group_id
         and owner_member.user_id = profile_share.owner_id
        join public.droid_archive_profiles owner_profiles
          on owner_profiles.user_id = profile_share.owner_id
        cross join lateral jsonb_array_elements(owner_profiles.profiles) profile
        where profile_share.group_id = target_group.id
          and profile ->> 'id' = profile_share.profile_id
      ), '[]'::jsonb)
    ) as group_document
    from public.droid_archive_groups target_group
    where public.is_droid_archive_group_member(target_group.id)
  ) visible_groups;
$$;

create or replace function public.save_shared_droid_archive_profile(
  target_group_id uuid,
  target_owner_id uuid,
  target_profile_id text,
  profile_data jsonb,
  expected_updated_at text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile jsonb;
  next_updated_at text;
  next_revision bigint;
begin
  if auth.uid() is null or jsonb_typeof(profile_data) <> 'object' then
    raise exception 'Invalid shared profile update.';
  end if;

  if not exists (
    select 1
    from public.droid_archive_group_profile_shares profile_share
    where profile_share.group_id = target_group_id
      and profile_share.owner_id = target_owner_id
      and profile_share.profile_id = target_profile_id
      and profile_share.can_edit
      and public.is_droid_archive_group_member(profile_share.group_id)
  ) then
    raise exception 'You do not have permission to edit this profile.';
  end if;

  select profile
  into current_profile
  from public.droid_archive_profiles owner_profiles,
       jsonb_array_elements(owner_profiles.profiles) profile
  where owner_profiles.user_id = target_owner_id
    and profile ->> 'id' = target_profile_id;

  if current_profile is null then
    raise exception 'The shared profile no longer exists.';
  end if;

  if expected_updated_at is not null
     and coalesce(current_profile ->> 'updatedAt', '') <> expected_updated_at then
    raise exception 'Shared profile conflict: this profile changed elsewhere. Reload before editing.';
  end if;

  next_updated_at := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  update public.droid_archive_profiles owner_profiles
  set profiles = (
        select jsonb_agg(
          case
            when profile ->> 'id' = target_profile_id then
              jsonb_set(
                jsonb_set(profile, '{data}', profile_data, true),
                '{updatedAt}',
                to_jsonb(next_updated_at),
                true
              )
            else profile
          end
        )
        from jsonb_array_elements(owner_profiles.profiles) profile
      ),
      revision = owner_profiles.revision + 1,
      updated_at = now()
  where owner_profiles.user_id = target_owner_id
  returning owner_profiles.revision into next_revision;

  return jsonb_build_object(
    'profileId', target_profile_id,
    'updatedAt', next_updated_at,
    'revision', next_revision,
    'data', profile_data
  );
end;
$$;

create or replace function public.leave_droid_archive_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.droid_archive_groups target_group
    where target_group.id = target_group_id
      and target_group.owner_id = auth.uid()
  ) then
    raise exception 'The group owner must delete the group instead of leaving it.';
  end if;

  delete from public.droid_archive_group_members
  where group_id = target_group_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.remove_droid_archive_group_member(
  target_group_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.droid_archive_groups target_group
    where target_group.id = target_group_id
      and target_group.owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can remove members.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'The group owner cannot remove themselves.';
  end if;

  delete from public.droid_archive_group_members
  where group_id = target_group_id
    and user_id = target_user_id;
end;
$$;

revoke all on function public.create_droid_archive_group(text, text) from public;
revoke all on function public.join_droid_archive_group(text, text) from public;
revoke all on function public.set_droid_archive_profile_share(uuid, text, boolean, boolean) from public;
revoke all on function public.droid_archive_group_workspace() from public;
revoke all on function public.save_shared_droid_archive_profile(uuid, uuid, text, jsonb, text) from public;
revoke all on function public.leave_droid_archive_group(uuid) from public;
revoke all on function public.remove_droid_archive_group_member(uuid, uuid) from public;

grant execute on function public.create_droid_archive_group(text, text) to authenticated;
grant execute on function public.join_droid_archive_group(text, text) to authenticated;
grant execute on function public.set_droid_archive_profile_share(uuid, text, boolean, boolean) to authenticated;
grant execute on function public.droid_archive_group_workspace() to authenticated;
grant execute on function public.save_shared_droid_archive_profile(uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function public.leave_droid_archive_group(uuid) to authenticated;
grant execute on function public.remove_droid_archive_group_member(uuid, uuid) to authenticated;
