-- =====================================================================
-- Brand Terms: brands must accept Align's Brand Terms, and must explicitly
-- agree to pay every time they commit to a price (send a request, counter,
-- or accept). The server records when and which terms version they agreed to.
-- (Client request, 2026-10-13.)
-- =====================================================================

-- Bump this (and BRAND_TERMS_VERSION in src/lib/legal.ts) whenever the terms change;
-- every brand is then asked to accept again.
create or replace function public.brand_terms_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '2026-10-13'::text $$;

alter table public.brand_profiles
  add column terms_version text,
  add column terms_accepted_at timestamptz;

-- Evidence on each request/deal of the brand's agreement to pay.
alter table public.requests
  add column brand_agreed_at timestamptz,
  add column brand_terms_version text;

create or replace function public.brand_has_current_terms(p_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select b.terms_version = public.brand_terms_version() from public.brand_profiles b where b.user_id = p_brand_id),
    false);
$$;

create or replace function public.accept_brand_terms(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.brand_profiles where user_id = v_uid) then
    raise exception 'Only brands accept the Brand Terms.';
  end if;
  if p_version is distinct from public.brand_terms_version() then
    raise exception 'The Brand Terms have been updated. Please reload the page and review them again.';
  end if;
  update public.brand_profiles set terms_version = p_version, terms_accepted_at = now() where user_id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------
-- Brand onboarding now requires accepting the terms
-- ---------------------------------------------------------------------
drop function public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text);

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
  p_accept_terms boolean
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
  update public.user_private set email = coalesce(nullif(trim(p_email), ''), email) where user_id = v_uid;
  insert into public.brand_profiles
    (user_id, brand_name, industry, ig_handle, followers, location, audience_age_min, audience_age_max, about,
     terms_version, terms_accepted_at)
  values
    (v_uid, trim(p_brand_name), p_industry, v_handle, coalesce(p_followers, 0), p_location,
     p_audience_age_min, p_audience_age_max, nullif(trim(p_about), ''),
     public.brand_terms_version(), now());
end;
$$;

-- ---------------------------------------------------------------------
-- Brand -> creator request: brand must agree to pay
-- ---------------------------------------------------------------------
drop function public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text, text);

create or replace function public.send_brand_request(
  p_creator_id uuid,
  p_deliverable text,
  p_content_type public.content_type,
  p_comp_type public.comp_type,
  p_amount int,
  p_deadline date,
  p_note text,
  p_content_other text default null,
  p_agree_to_pay boolean default false
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
  if not public.brand_has_current_terms(v_uid) then
    raise exception 'Please accept the Align Brand Terms first.';
  end if;
  if not coalesce(p_agree_to_pay, false) then
    raise exception 'Please confirm you agree to pay the creator as per the Brand Terms.';
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
    (brand_id, creator_id, initiated_by, deliverable, content_type, content_other, comp_type, amount, deadline, note,
     brand_agreed_at, brand_terms_version)
  values
    (v_uid, p_creator_id, v_uid, trim(p_deliverable), p_content_type, v_other, p_comp_type,
     case when p_comp_type = 'barter' then null else p_amount end,
     p_deadline, nullif(trim(p_note), ''),
     now(), public.brand_terms_version())
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Accept / counter: when the brand commits to a price, it must agree to pay
-- ---------------------------------------------------------------------
drop function public.respond_request(uuid, text, int);

create or replace function public.respond_request(
  p_request_id uuid,
  p_action text,
  p_counter_amount int default null,
  p_agree_to_pay boolean default false
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_active();
  v_r public.requests;
  v_c public.campaigns;
  v_deal_id uuid;
  v_brand_commits boolean;
begin
  select * into v_r from public.requests where id = p_request_id for update;
  if v_r.id is null or v_uid not in (v_r.brand_id, v_r.creator_id) then
    raise exception 'Request not found.';
  end if;
  if p_action not in ('accept', 'decline', 'counter') then
    raise exception 'Unknown action.';
  end if;

  if v_r.status = 'requested' then
    if v_uid = v_r.initiated_by then
      raise exception 'You sent this request. Waiting for the other side to respond.';
    end if;
  elsif v_r.status = 'countered' then
    if v_uid <> v_r.initiated_by then
      raise exception 'You sent a counter-offer. Waiting for the other side to respond.';
    end if;
    if p_action = 'counter' then
      raise exception 'Only one counter-offer is allowed. You can accept or decline.';
    end if;
  else
    raise exception 'This request is already %.', v_r.status;
  end if;

  if p_action = 'decline' then
    update public.requests set status = 'declined', updated_at = now() where id = v_r.id;
    return null;
  end if;

  -- The brand commits to a price whenever it accepts or counters.
  v_brand_commits := v_uid = v_r.brand_id;
  if v_brand_commits then
    if not public.brand_has_current_terms(v_uid) then
      raise exception 'Please accept the Align Brand Terms first.';
    end if;
    if not coalesce(p_agree_to_pay, false) then
      raise exception 'Please confirm you agree to pay the creator as per the Brand Terms.';
    end if;
  end if;

  if p_action = 'counter' then
    if v_r.comp_type = 'barter' then
      raise exception 'Barter requests have no price to counter. You can accept or decline.';
    end if;
    if coalesce(p_counter_amount, 0) <= 0 then
      raise exception 'Please enter your counter price.';
    end if;
    if p_counter_amount = v_r.amount then
      raise exception 'Your counter is the same as the offer. Just accept it instead!';
    end if;
    update public.requests
       set status = 'countered', counter_amount = p_counter_amount, countered_by = v_uid, updated_at = now(),
           brand_agreed_at = case when v_brand_commits then now() else brand_agreed_at end,
           brand_terms_version = case when v_brand_commits then public.brand_terms_version() else brand_terms_version end
     where id = v_r.id;
    return null;
  end if;

  -- accept
  if v_r.campaign_id is not null then
    select * into v_c from public.campaigns where id = v_r.campaign_id for update;
    if v_c.slots_filled >= v_c.slots then
      raise exception 'All slots for this campaign are already filled.';
    end if;
  end if;

  update public.requests
     set status = 'accepted', updated_at = now(),
         brand_agreed_at = case when v_brand_commits then now() else brand_agreed_at end,
         brand_terms_version = case when v_brand_commits then public.brand_terms_version() else brand_terms_version end
   where id = v_r.id;
  select id into v_deal_id from public.deals where request_id = v_r.id;  -- created by trigger
  return v_deal_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Deal Card shows the brand's agreement
-- ---------------------------------------------------------------------
drop view public.deal_cards;
create view public.deal_cards with (security_invoker = true) as
  select d.*, q.deliverable, q.content_type, q.content_other, q.deadline, q.note, q.campaign_id,
         q.brand_agreed_at, q.brand_terms_version,
         b.brand_name, u.name as creator_name, cp.ig_handle as creator_ig_handle
    from public.deals d
    join public.requests q on q.id = d.request_id
    join public.brand_profiles b on b.user_id = d.brand_id
    join public.creator_profiles cp on cp.user_id = d.creator_id
    join public.users u on u.id = d.creator_id;
grant select on public.deal_cards to authenticated;

-- request_cards uses q.*; rebuild so it includes the new columns.
drop view public.request_cards;
create view public.request_cards with (security_invoker = true) as
  select q.*, b.brand_name, u.name as creator_name, cp.ig_handle as creator_ig_handle,
         cp.followers as creator_followers, c.title as campaign_title, d.id as deal_id
    from public.requests q
    join public.brand_profiles b on b.user_id = q.brand_id
    join public.creator_profiles cp on cp.user_id = q.creator_id
    join public.users u on u.id = q.creator_id
    left join public.campaigns c on c.id = q.campaign_id
    left join public.deals d on d.request_id = q.id;
grant select on public.request_cards to authenticated;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
revoke execute on function
  public.brand_terms_version(),
  public.brand_has_current_terms(uuid),
  public.accept_brand_terms(text),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean),
  public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text, text, boolean),
  public.respond_request(uuid, text, int, boolean)
from public, anon;
grant execute on function
  public.brand_terms_version(),
  public.brand_has_current_terms(uuid),
  public.accept_brand_terms(text),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text, boolean),
  public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text, text, boolean),
  public.respond_request(uuid, text, int, boolean)
to authenticated;
