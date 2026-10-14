-- Creator follower limit raised from 1K–10K to 1K–12K (client request, 2026-10-09).

alter table public.creator_profiles drop constraint creator_profiles_followers_check;
alter table public.creator_profiles
  add constraint creator_profiles_followers_check check (followers between 1000 and 12000);

create or replace function public.complete_creator_onboarding(
  p_name text,
  p_email text,
  p_age int,
  p_ig_handle text,
  p_followers int,
  p_niche text,
  p_city text,
  p_content_types public.content_type[],
  p_rate_bucket public.budget_bucket,
  p_bio text,
  p_portfolio text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := public.normalize_handle(p_ig_handle);
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if exists (select 1 from public.users where id = v_uid and role is not null) then
    raise exception 'Your profile is already set up.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Please tell us your name.';
  end if;
  if p_age is null or p_age < 18 then
    raise exception 'Align is only for people aged 18 and over. Thanks for your interest, and we''d love to see you when you turn 18!';
  end if;
  if p_followers is null or p_followers < 1000 or p_followers > 12000 then
    raise exception 'Align is built for creators with 1K–12K followers right now. Thanks for your interest, and do check back if that changes!';
  end if;
  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'That doesn''t look like a valid Instagram handle.';
  end if;
  if exists (select 1 from public.creator_profiles where ig_handle = v_handle) then
    raise exception 'That Instagram handle is already registered on Align.';
  end if;
  if cardinality(p_portfolio) is null or cardinality(p_portfolio) not between 3 and 6 then
    raise exception 'Please add 3 to 6 portfolio items.';
  end if;

  update public.users set role = 'creator', name = left(trim(p_name), 60) where id = v_uid;
  update public.user_private set email = coalesce(nullif(trim(p_email), ''), email) where user_id = v_uid;
  insert into public.creator_profiles
    (user_id, age, ig_handle, followers, niche, city, content_types, rate_bucket, bio, portfolio)
  values
    (v_uid, p_age, v_handle, p_followers, p_niche, p_city, coalesce(p_content_types, '{}'),
     p_rate_bucket, nullif(trim(p_bio), ''), p_portfolio);
end;
$$;
