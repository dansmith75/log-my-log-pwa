-- Optional verification after running supabase-profiles.sql
select
  id,
  first_name,
  surname,
  nickname,
  mobile,
  country,
  region,
  updated_at
from public.profiles
order by updated_at desc;
