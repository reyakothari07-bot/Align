-- =====================================================================
-- Google-first login (2026-10-14): no SMS. The mobile number is collected
-- during profile setup instead, validated as an Indian mobile number and
-- stored privately in user_private (never shown to other users).
-- =====================================================================

-- "98765 43210", "+91 98765-43210", "098765 43210" -> "919876543210"; anything else -> null.
create or replace function public.normalize_in_mobile(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when d ~ '^[6-9][0-9]{9}$' then '91' || d end
    from (select regexp_replace(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '^(91|0)(?=[0-9]{10}$)', '') as d) x;
$$;

alter table public.user_private
  add constraint user_private_phone_check check (phone is null or phone ~ '^91[6-9][0-9]{9}$');

-- Users can correct their own number (RLS already limits this to their own row).
grant update (phone) on public.user_private to authenticated;

drop function public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[]);
create or replace function public.complete_creator_onboarding(
  p_name text,
  p_email text,
  p_age int,
  p_ig_handle text,
  p_followers int,
  p_niche text,
  p_city text,
  p_content_types public.content_type[],
  p_other_content text,
  p_rates jsonb,
  p_bio text,
  p_portfolio text[],
  p_phone text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := public.normalize_handle(p_ig_handle);
  v_phone text := public.normalize_in_mobile(p_phone);
  v_other text := nullif(trim(coalesce(p_other_content, '')), '');
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if exists (select 1 from public.users where id = v_uid and role is not null) then
    raise exception 'Your profile is already set up.';
  end if;
  if nullif(trim(coalesce(p_phone, '')), '') is not null and v_phone is null then
    raise exception 'Please enter a valid 10-digit Indian mobile number.';
  end if;
  if v_phone is null and not exists (select 1 from public.user_private where user_id = v_uid and phone is not null) then
    raise exception 'Please add your mobile number. It stays private.';
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
  if coalesce(cardinality(p_content_types), 0) = 0 then
    raise exception 'Pick at least one type of content you make.';
  end if;
  if 'Other'::public.content_type = any (p_content_types) and v_other is null then
    raise exception 'Tell us what kind of "Other" content you make.';
  end if;
  if not ('Other'::public.content_type = any (p_content_types)) then
    v_other := null;
  end if;
  if not public.valid_other('Other'::public.content_type = any (p_content_types), v_other) then
    raise exception 'Please keep the "Other" description short, without contact details.';
  end if;
  if not public.valid_rates(coalesce(p_rates, '{}'), p_content_types) then
    raise exception 'Please choose a rate for each type of content you make.';
  end if;
  if cardinality(p_portfolio) is null or cardinality(p_portfolio) not between 3 and 6 then
    raise exception 'Please add 3 to 6 portfolio items.';
  end if;

  update public.users set role = 'creator', name = left(trim(p_name), 60) where id = v_uid;
  update public.user_private set email = coalesce(nullif(trim(p_email), ''), email), phone = coalesce(v_phone, phone)
   where user_id = v_uid;
  insert into public.creator_profiles
    (user_id, age, ig_handle, followers, niche, city, content_types, other_content, rates, bio, portfolio)
  values
    (v_uid, p_age, v_handle, p_followers, p_niche, p_city, p_content_types, v_other,
     p_rates, nullif(trim(p_bio), ''), p_portfolio);
end;
$$;

drop function public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean);
create or replace function public.complete_brand_onboarding(
  p_name text,
  p_email text,
  p_confirm_adult boolean,
  p_brand_name text,
  p_industry text,
  p_ig_handle text,
  p_followers int,
  p_location text,
  p_audience_age_min int,
  p_audience_age_max int,
  p_about text,
  p_accept_terms boolean,
  p_phone text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := public.normalize_handle(p_ig_handle);
  v_phone text := public.normalize_in_mobile(p_phone);
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if exists (select 1 from public.users where id = v_uid and role is not null) then
    raise exception 'Your profile is already set up.';
  end if;
  if nullif(trim(coalesce(p_phone, '')), '') is not null and v_phone is null then
    raise exception 'Please enter a valid 10-digit Indian mobile number.';
  end if;
  if v_phone is null and not exists (select 1 from public.user_private where user_id = v_uid and phone is not null) then
    raise exception 'Please add your mobile number. It stays private.';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_brand_name), '') = '' then
    raise exception 'Please add your name and your brand''s name.';
  end if;
  if not coalesce(p_confirm_adult, false) then
    raise exception 'Align is only for people aged 18 and over. Thanks for your interest!';
  end if;
  if not coalesce(p_accept_terms, false) then
    raise exception 'Please read and accept the Align Brand Terms to continue.';
  end if;
  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'That doesn''t look like a valid Instagram handle.';
  end if;
  if exists (select 1 from public.brand_profiles where ig_handle = v_handle) then
    raise exception 'That Instagram handle is already registered on Align.';
  end if;

  update public.users set role = 'brand', name = left(trim(p_name), 60) where id = v_uid;
  update public.user_private set email = coalesce(nullif(trim(p_email), ''), email), phone = coalesce(v_phone, phone)
   where user_id = v_uid;
  insert into public.brand_profiles
    (user_id, brand_name, industry, ig_handle, followers, location, audience_age_min, audience_age_max, about,
     terms_version, terms_accepted_at)
  values
    (v_uid, trim(p_brand_name), p_industry, v_handle, coalesce(p_followers, 0), p_location,
     p_audience_age_min, p_audience_age_max, nullif(trim(p_about), ''),
     public.brand_terms_version(), now());
end;
$$;

revoke execute on function
  public.normalize_in_mobile(text),
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[], text),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean, text)
from public, anon;
grant execute on function
  public.normalize_in_mobile(text),
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[], text),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean, text)
to authenticated;
