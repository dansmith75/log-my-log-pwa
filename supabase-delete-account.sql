-- Run once in the Supabase SQL Editor for Log My Log v3.5.
-- Allows an authenticated user to delete ONLY their own auth account.
-- Existing logs are removed by the logs.user_id foreign-key cascade if configured;
-- the explicit delete below also clears them safely.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.logs where user_id = caller;
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
