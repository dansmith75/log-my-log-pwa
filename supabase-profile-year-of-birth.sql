-- Log My Log v4.1.1
-- Run once in Supabase SQL Editor before testing Year of Birth.
alter table public.profiles
  add column if not exists year_of_birth smallint;

alter table public.profiles
  drop constraint if exists profiles_year_of_birth_check;

alter table public.profiles
  add constraint profiles_year_of_birth_check
  check (year_of_birth is null or year_of_birth between 1900 and 2100);

-- Migrate a legacy value if one was ever stored in Auth metadata.
update public.profiles p
set year_of_birth = nullif(u.raw_user_meta_data ->> 'year_of_birth','')::smallint,
    updated_at = now()
from auth.users u
where p.id = u.id
  and p.year_of_birth is null
  and (u.raw_user_meta_data ->> 'year_of_birth') ~ '^[0-9]{4}$';
