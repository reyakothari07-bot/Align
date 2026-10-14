-- =====================================================================
-- 1. Creators set a rate per content type (Reel, Story, ...) instead of one rate.
-- 2. Picking "Other" as a content type asks for a short description,
--    on creator profiles, campaigns and requests.
-- (Client request, 2026-10-09.)
-- =====================================================================

-- Views expand their columns at creation time, so rebuild them around the change.
drop view public.creator_cards;
drop view public.campaign_cards;
drop view public.request_cards;
drop view public.deal_cards;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
-- rates must be {"<content type>": "<budget bucket>"} with exactly one entry per content type.
create or replace function public.valid_rates(p_rates jsonb, p_types public.content_type[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_rates) = 'object'
     and (select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(p_rates) k)
         = (select coalesce(array_agg(t::text order by t::text), '{}') from unnest(p_types) t)
     and not exists (
       select 1 from jsonb_each(p_rates) e
        where jsonb_typeof(e.value) <> 'string'
           or not ((e.value #>> '{}') = any (enum_range(null::public.budget_bucket)::text[])));
$$;

-- "Other" needs a description (max 40 chars, no contact details); anything else must not have one.
create or replace function public.valid_other(p_is_other boolean, p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_is_other = (nullif(trim(coalesce(p_text, '')), '') is not null)
     and char_length(coalesce(p_text, '')) <= 40
     and not public.has_contact_info(p_text);
$$;

-- ---------------------------------------------------------------------
-- Creator profiles: rate_bucket -> rates (jsonb), plus other_content
-- ---------------------------------------------------------------------
alter table public.creator_profiles
  add column rates jsonb not null default '{}',
  add column other_content text;

-- Keep existing creators' rate: copy it onto every content type they picked.
update public.creator_profiles
   set rates = coalesce(
         (select jsonb_object_agg(t::text, coalesce(rate_bucket::text, 'Barter')) from unnest(content_types) t),
         '{}'),
       other_content = case when 'Other'::public.content_type = any (content_types) then 'Other content' end;

alter table public.creator_profiles drop column rate_bucket;
alter table public.creator_profiles
  add constraint creator_profiles_rates_check check (public.valid_rates(rates, content_types)),
  add constraint creator_profiles_other_check
    check (public.valid_other('Other'::public.content_type = any (content_types), other_content));

-- ---------------------------------------------------------------------
-- Campaigns and requests: content_other
-- ---------------------------------------------------------------------
alter table public.campaigns add column content_other text;
update public.campaigns set content_other = 'Other content' where content_type = 'Other';
alter table public.campaigns
  add constraint campaigns_content_other_check check (public.valid_other(content_type = 'Other', content_other));

alter table public.requests add column content_other text;
update public.requests set content_other = 'Other content' where content_type = 'Other';
alter table public.requests
  add constraint requests_content_other_check check (public.valid_other(content_type = 'Other', content_other));

-- ---------------------------------------------------------------------
-- Onboarding takes per-type rates and the "Other" description
-- ---------------------------------------------------------------------
drop function public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], public.budget_bucket, text, text[]);

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
  p_portfolio text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := public.normalize_handle(p_ig_handle);
  v_other text := nullif(trim(coalesce(p_other_content, '')), '');
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
  update public.user_private set email = coalesce(nullif(trim(p_email), ''), email) where user_id = v_uid;
  insert into public.creator_profiles
    (user_id, age, ig_handle, followers, niche, city, content_types, other_content, rates, bio, portfolio)
  values
    (v_uid, p_age, v_handle, p_followers, p_niche, p_city, p_content_types, v_other,
     p_rates, nullif(trim(p_bio), ''), p_portfolio);
end;
$$;

-- ---------------------------------------------------------------------
-- Brand -> creator requests take the "Other" description
-- ---------------------------------------------------------------------
drop function public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text);

create or replace function public.send_brand_request(
  p_creator_id uuid,
  p_deliverable text,
  p_content_type public.content_type,
  p_comp_type public.comp_type,
  p_amount int,
  p_deadline date,
  p_note text,
  p_content_other text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_active();
  v_other text := case when p_content_type = 'Other' then nullif(trim(coalesce(p_content_other, '')), '') end;
  v_id uuid;
begin
  if not exists (select 1 from public.brand_profiles where user_id = v_uid) then
    raise exception 'Only brands can send collaboration requests.';
  end if;
  if not exists (
    select 1 from public.creator_profiles c join public.users u on u.id = c.user_id
    where c.user_id = p_creator_id and not u.suspended
  ) then
    raise exception 'That creator isn''t available.';
  end if;
  if p_deadline is null or p_deadline < current_date then
    raise exception 'Please pick a deadline that is today or later.';
  end if;
  if p_comp_type <> 'barter' and coalesce(p_amount, 0) <= 0 then
    raise exception 'Please enter a budget for paid collaborations.';
  end if;
  if p_content_type = 'Other' and v_other is null then
    raise exception 'Tell the creator what kind of content you need.';
  end if;
  if public.has_contact_info(p_deliverable || ' ' || coalesce(p_note, '') || ' ' || coalesce(v_other, '')) then
    raise exception 'Sharing contact details isn''t allowed on Align.';
  end if;
  if char_length(coalesce(v_other, '')) > 40 then
    raise exception 'Please keep the content description under 40 characters.';
  end if;

  insert into public.requests
    (brand_id, creator_id, initiated_by, deliverable, content_type, content_other, comp_type, amount, deadline, note)
  values
    (v_uid, p_creator_id, v_uid, trim(p_deliverable), p_content_type, v_other, p_comp_type,
     case when p_comp_type = 'barter' then null else p_amount end,
     p_deadline, nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Applications copy the campaign's "Other" description onto the request.
create or replace function public.apply_to_campaign(
  p_campaign_id uuid,
  p_quote int,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_active();
  v_c public.campaigns;
  v_id uuid;
begin
  if not exists (select 1 from public.creator_profiles where user_id = v_uid) then
    raise exception 'Only creators can apply to campaigns.';
  end if;
  select * into v_c from public.campaigns where id = p_campaign_id;
  if v_c.id is null then
    raise exception 'Campaign not found.';
  end if;
  if v_c.status <> 'open' or v_c.deadline < current_date then
    raise exception 'This campaign is no longer accepting applications.';
  end if;
  if v_c.comp_type <> 'barter' and coalesce(p_quote, 0) <= 0 then
    raise exception 'Please add your price quote.';
  end if;
  if exists (
    select 1 from public.requests
    where campaign_id = p_campaign_id and creator_id = v_uid and status in ('requested', 'countered', 'accepted')
  ) then
    raise exception 'You''ve already applied to this campaign.';
  end if;
  if public.has_contact_info(p_note) then
    raise exception 'Sharing contact details isn''t allowed on Align.';
  end if;

  insert into public.requests
    (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, content_other, comp_type, amount, deadline, note)
  values
    (v_c.id, v_c.brand_id, v_uid, v_uid, v_c.title, v_c.content_type, v_c.content_other, v_c.comp_type,
     case when v_c.comp_type = 'barter' then null else p_quote end,
     v_c.deadline, nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Read models
-- ---------------------------------------------------------------------
create view public.creator_cards with (security_invoker = true) as
  select c.user_id, u.name, c.age, c.ig_handle, c.followers, c.niche, c.city,
         c.content_types, c.other_content, c.rates,
         array(select e.value from jsonb_each_text(c.rates) e) as rate_buckets,
         c.bio, c.portfolio, c.created_at,
         coalesce(r.avg_stars, 0) as avg_stars, coalesce(r.review_count, 0) as review_count
    from public.creator_profiles c
    join public.users u on u.id = c.user_id
    left join public.user_ratings r on r.user_id = c.user_id
   where not u.suspended;

create view public.campaign_cards with (security_invoker = true) as
  select c.*, b.brand_name, b.industry, b.location, b.ig_handle as brand_ig_handle,
         coalesce(r.avg_stars, 0) as brand_avg_stars, coalesce(r.review_count, 0) as brand_review_count
    from public.campaigns c
    join public.brand_profiles b on b.user_id = c.brand_id
    left join public.user_ratings r on r.user_id = c.brand_id;

create view public.request_cards with (security_invoker = true) as
  select q.*, b.brand_name, u.name as creator_name, cp.ig_handle as creator_ig_handle,
         cp.followers as creator_followers, c.title as campaign_title, d.id as deal_id
    from public.requests q
    join public.brand_profiles b on b.user_id = q.brand_id
    join public.creator_profiles cp on cp.user_id = q.creator_id
    join public.users u on u.id = q.creator_id
    left join public.campaigns c on c.id = q.campaign_id
    left join public.deals d on d.request_id = q.id;

create view public.deal_cards with (security_invoker = true) as
  select d.*, q.deliverable, q.content_type, q.content_other, q.deadline, q.note, q.campaign_id,
         b.brand_name, u.name as creator_name, cp.ig_handle as creator_ig_handle
    from public.deals d
    join public.requests q on q.id = d.request_id
    join public.brand_profiles b on b.user_id = d.brand_id
    join public.creator_profiles cp on cp.user_id = d.creator_id
    join public.users u on u.id = d.creator_id;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
grant select on public.creator_cards, public.campaign_cards, public.request_cards, public.deal_cards to authenticated;
grant update (rates, other_content) on public.creator_profiles to authenticated;
grant insert (content_other), update (content_other) on public.campaigns to authenticated;

revoke execute on function
  public.valid_rates(jsonb, public.content_type[]),
  public.valid_other(boolean, text),
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[]),
  public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text, text)
from public, anon;
grant execute on function
  public.valid_rates(jsonb, public.content_type[]),
  public.valid_other(boolean, text),
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], text, jsonb, text, text[]),
  public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text, text)
to authenticated;
