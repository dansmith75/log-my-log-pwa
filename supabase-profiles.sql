-- Log My Log v3.5.1
-- Run once in Supabase SQL Editor.
-- Creates a private public.profiles table linked 1:1 to auth.users,
-- secures it with RLS, and migrates any existing profile values from Auth user metadata.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  surname text,
  nickname text,
  mobile text,
  country text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select, insert, update, delete
on table public.profiles
to authenticated;

revoke all
on table public.profiles
from anon;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

-- Preserve any profile data already saved by v3.5 in auth.users.raw_user_meta_data.
insert into public.profiles (
  id, first_name, surname, nickname, mobile, country, region
)
select
  id,
  nullif(raw_user_meta_data ->> 'first_name',''),
  nullif(raw_user_meta_data ->> 'surname',''),
  nullif(raw_user_meta_data ->> 'nickname',''),
  nullif(raw_user_meta_data ->> 'mobile',''),
  nullif(raw_user_meta_data ->> 'country',''),
  nullif(raw_user_meta_data ->> 'region','')
from auth.users
where
  coalesce(raw_user_meta_data ->> 'first_name','') <> ''
  or coalesce(raw_user_meta_data ->> 'surname','') <> ''
  or coalesce(raw_user_meta_data ->> 'nickname','') <> ''
  or coalesce(raw_user_meta_data ->> 'mobile','') <> ''
  or coalesce(raw_user_meta_data ->> 'country','') <> ''
  or coalesce(raw_user_meta_data ->> 'region','') <> ''
on conflict (id) do update set
  first_name = coalesce(excluded.first_name, public.profiles.first_name),
  surname = coalesce(excluded.surname, public.profiles.surname),
  nickname = coalesce(excluded.nickname, public.profiles.nickname),
  mobile = coalesce(excluded.mobile, public.profiles.mobile),
  country = coalesce(excluded.country, public.profiles.country),
  region = coalesce(excluded.region, public.profiles.region),
  updated_at = now();
