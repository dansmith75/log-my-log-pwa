-- Log My Log v4.2
-- Run once in Supabase SQL Editor.
-- Adds optional Sex and analytics consent, then creates a privacy-thresholded
-- aggregate function. Raw logs are never returned by the function.

alter table public.profiles
  add column if not exists sex text;

alter table public.profiles
  add column if not exists analytics_consent boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_sex_check;

alter table public.profiles
  add constraint profiles_sex_check
  check (sex is null or sex in ('male','female','prefer-not'));

create or replace function public.get_my_cohort_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  p public.profiles%rowtype;
  current_year integer := extract(year from current_date)::integer;
  caller_age integer;
  age_min integer;
  age_max integer;
  cohort_count integer;
  cohort_label text;
  min_group integer := 20;
  result jsonb;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into p from public.profiles where id = caller;
  if not found or coalesce(p.analytics_consent,false) = false then
    return jsonb_build_object(
      'available', false,
      'reason', 'consent_required',
      'minimum_group_size', min_group
    );
  end if;

  if p.year_of_birth is not null then
    caller_age := current_year - p.year_of_birth;
    if caller_age < 25 then age_min := 18; age_max := 24;
    elsif caller_age < 35 then age_min := 25; age_max := 34;
    elsif caller_age < 45 then age_min := 35; age_max := 44;
    elsif caller_age < 55 then age_min := 45; age_max := 54;
    elsif caller_age < 65 then age_min := 55; age_max := 64;
    else age_min := 65; age_max := 120;
    end if;
  end if;

  -- Cohort hierarchy: broad country + age band + sex first.
  -- If too small, fall back to country + age band, then country only.
  with eligible as (
    select pr.id
    from public.profiles pr
    where pr.analytics_consent = true
      and (p.country is null or pr.country = p.country)
      and (p.sex is null or p.sex = 'prefer-not' or pr.sex = p.sex)
      and (
        age_min is null
        or pr.year_of_birth is null
        or (current_year - pr.year_of_birth) between age_min and age_max
      )
  )
  select count(*) into cohort_count from eligible;

  cohort_label := concat_ws(' · ',
    nullif(p.country,''),
    case when age_min is not null then age_min::text || '–' || case when age_max=120 then 'plus' else age_max::text end end,
    case when p.sex in ('male','female') then initcap(p.sex) end
  );

  if cohort_count < min_group then
    with eligible as (
      select pr.id
      from public.profiles pr
      where pr.analytics_consent = true
        and (p.country is null or pr.country = p.country)
        and (
          age_min is null
          or pr.year_of_birth is null
          or (current_year - pr.year_of_birth) between age_min and age_max
        )
    )
    select count(*) into cohort_count from eligible;

    cohort_label := concat_ws(' · ',
      nullif(p.country,''),
      case when age_min is not null then age_min::text || '–' || case when age_max=120 then 'plus' else age_max::text end end
    );
  end if;

  if cohort_count < min_group then
    with eligible as (
      select pr.id
      from public.profiles pr
      where pr.analytics_consent = true
        and (p.country is null or pr.country = p.country)
    )
    select count(*) into cohort_count from eligible;

    cohort_label := coalesce(nullif(p.country,''),'All opted-in users');
  end if;

  if cohort_count < min_group then
    return jsonb_build_object(
      'available', false,
      'reason', 'insufficient_group',
      'cohort_size', cohort_count,
      'minimum_group_size', min_group
    );
  end if;

  with cohort_users as (
    select pr.id
    from public.profiles pr
    where pr.analytics_consent = true
      and (p.country is null or pr.country = p.country)
  ),
  recent_logs as (
    select l.*
    from public.logs l
    join cohort_users cu on cu.id = l.user_id
    where l.deleted_at is null
      and l.timestamp >= now() - interval '90 days'
  ),
  per_user as (
    select user_id, count(*)::numeric / (90.0/7.0) as logs_per_week
    from recent_logs
    group by user_id
  )
  select jsonb_build_object(
    'available', true,
    'cohort_size', cohort_count,
    'minimum_group_size', min_group,
    'cohort_label', cohort_label,
    'avg_logs_per_week', (select avg(logs_per_week) from per_user),
    'avg_bristol_type', (select avg(bristol_type)::numeric from recent_logs),
    'ideal_type_pct', (
      select case when count(*)=0 then null
        else 100.0 * count(*) filter (where bristol_type between 3 and 5) / count(*)
      end
      from recent_logs
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_my_cohort_stats() from public;
grant execute on function public.get_my_cohort_stats() to authenticated;
