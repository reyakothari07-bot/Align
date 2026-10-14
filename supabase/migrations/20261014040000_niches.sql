-- =====================================================================
-- Niches (client request, 2026-10-14):
--  * Creators can pick up to 3 niches (the first is their main niche).
--  * Picking "Other" asks for a short description, for creator niches,
--    brand industry and campaign niche.
-- =====================================================================

drop view public.creator_cards;
drop view public.brand_cards;
drop view public.campaign_cards;

alter table public.creator_profiles
  add column niches text[] not null default '{}',
  add column niche_other text;
update public.creator_profiles set niches = array[niche];
alter table public.creator_profiles
  add constraint creator_profiles_niches_check check (cardinality(niches) between 1 and 3 and niche = niches[1]),
  add constraint creator_profiles_niche_other_check check (public.valid_other('Other' = any (niches), niche_other));

alter table public.brand_profiles add column industry_other text;
alter table public.brand_profiles
  add constraint brand_profiles_industry_other_check check (public.valid_other(industry = 'Other', industry_other));

alter table public.campaigns add column niche_other text;
alter table public.campaigns
  add constraint campaigns_niche_other_check check (public.valid_other(niche = 'Other', niche_other));

drop function public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[], text);
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
  p_phone text default null,
  p_niches text[] default null,
  p_niche_other text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := public.normalize_handle(p_ig_handle);
  v_phone text := public.normalize_in_mobile(p_phone);
  v_niches text[] := (select array_agg(n order by o) from (select distinct on (n) n, o from unnest(coalesce(p_niches, array[p_niche])) with ordinality u(n, o) where nullif(trim(n), '') is not null order by n, o) d);
  v_niche_other text := nullif(trim(coalesce(p_niche_other, '')), '');
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
  if coalesce(cardinality(v_niches), 0) = 0 then
    raise exception 'Please pick at least one niche.';
  end if;
  if cardinality(v_niches) > 3 then
    raise exception 'Please pick up to 3 niches.';
  end if;
  if 'Other' = any (v_niches) and v_niche_other is null then
    raise exception 'Tell us your niche in the "Other" box.';
  end if;
  if not ('Other' = any (v_niches)) then
    v_niche_other := null;
  end if;
  if not public.valid_other('Other' = any (v_niches), v_niche_other) then
    raise exception 'Please keep your niche short, without contact details.';
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
    (user_id, age, ig_handle, followers, niche, niches, niche_other, city, content_types, other_content, rates, bio, portfolio)
  values
    (v_uid, p_age, v_handle, p_followers, v_niches[1], v_niches, v_niche_other, p_city, p_content_types, v_other,
     p_rates, nullif(trim(p_bio), ''), p_portfolio);
end;
$$;

drop function public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean, text);
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
  p_phone text default null,
  p_industry_other text default null
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
  if p_industry = 'Other' and nullif(trim(coalesce(p_industry_other, '')), '') is null then
    raise exception 'Tell us your industry in the "Other" box.';
  end if;
  if not public.valid_other(p_industry = 'Other', case when p_industry = 'Other' then nullif(trim(coalesce(p_industry_other, '')), '') end) then
    raise exception 'Please keep your industry short, without contact details.';
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
     terms_version, terms_accepted_at, industry_other)
  values
    (v_uid, trim(p_brand_name), p_industry, v_handle, coalesce(p_followers, 0), p_location,
     p_audience_age_min, p_audience_age_max, nullif(trim(p_about), ''),
     public.brand_terms_version(), now(),
     case when p_industry = 'Other' then nullif(trim(coalesce(p_industry_other, '')), '') end);
end;
$$;

create view public.creator_cards with (security_invoker = true) as
  select c.user_id, u.name, c.age, c.ig_handle, c.followers, c.niche, c.niches, c.niche_other, c.city,
         c.content_types, c.other_content, c.rates,
         array(select e.value from jsonb_each_text(c.rates) e) as rate_buckets,
         c.bio, c.portfolio, c.created_at,
         coalesce(r.avg_stars, 0) as avg_stars, coalesce(r.review_count, 0) as review_count
    from public.creator_profiles c
    join public.users u on u.id = c.user_id
    left join public.user_ratings r on r.user_id = c.user_id
   where not u.suspended;

create view public.brand_cards with (security_invoker = true) as
  select b.user_id, u.name as contact_name, b.brand_name, b.industry, b.industry_other, b.ig_handle, b.followers,
         b.location, b.audience_age_min, b.audience_age_max, b.about, b.created_at,
         coalesce(r.avg_stars, 0) as avg_stars, coalesce(r.review_count, 0) as review_count,
         public.brand_open_payment_reports(b.user_id) as open_payment_reports
    from public.brand_profiles b
    join public.users u on u.id = b.user_id
    left join public.user_ratings r on r.user_id = b.user_id;

create view public.campaign_cards with (security_invoker = true) as
  select c.*, b.brand_name, b.industry, b.industry_other, b.location, b.ig_handle as brand_ig_handle,
         coalesce(r.avg_stars, 0) as brand_avg_stars, coalesce(r.review_count, 0) as brand_review_count,
         public.brand_open_payment_reports(c.brand_id) as brand_open_payment_reports
    from public.campaigns c
    join public.brand_profiles b on b.user_id = c.brand_id
    left join public.user_ratings r on r.user_id = c.brand_id;

grant select on public.creator_cards, public.brand_cards, public.campaign_cards to authenticated;
grant update (niches, niche_other) on public.creator_profiles to authenticated;
grant update (industry_other) on public.brand_profiles to authenticated;
grant insert (niche_other), update (niche_other) on public.campaigns to authenticated;

revoke execute on function
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[], text, text[], text),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean, text, text)
from public, anon;
grant execute on function
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[], text, text[], text),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean, text, text)
to authenticated;
