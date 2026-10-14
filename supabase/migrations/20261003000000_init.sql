-- =====================================================================
-- Align MVP schema
--
-- Design rules (see ALIGN_HANDOFF.md):
--  * Contact details (phone/email) live only in user_private, readable by
--    the owner alone. Nothing else stores or exposes them.
--  * Clients never write requests/deals/messages/reviews directly. Every
--    state change goes through a SECURITY DEFINER function that validates
--    who is acting and what transition is allowed.
--  * Column-level grants decide which profile fields are editable
--    (e.g. ig_handle is not).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('creator', 'brand');
create type public.content_type as enum ('UGC', 'Reel', 'Post', 'Story', 'Other');
create type public.comp_type as enum ('paid', 'barter', 'both');
create type public.budget_bucket as enum (
  'Barter', '₹1K–2K', '₹2K–3K', '₹3K–4K', '₹4K–5K', '₹5K–6K', '₹6K–7K',
  '₹7K–8K', '₹8K–9K', '₹9K–10K', '₹10K–11K', '₹11K–12K', '₹12K+'
);
create type public.campaign_status as enum ('open', 'closed');
create type public.request_status as enum ('requested', 'countered', 'accepted', 'declined');
create type public.deal_status as enum ('in_progress', 'posted', 'payment_received', 'completed', 'disputed');

-- ---------------------------------------------------------------------
-- Contact-info detector. Used by the chat filter and by check
-- constraints on every free-text field another user can read.
--   * 10+ digits, allowing spaces, dots, dashes, brackets and +91
--   * email addresses
--   * wa.me / t.me links, "whatsapp", "telegram"
-- ---------------------------------------------------------------------
create or replace function public.has_contact_info(txt text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(txt, '') ~ '\d([[:space:].()-]*\d){9,}'
      or coalesce(txt, '') ~* '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}'
      or coalesce(txt, '') ~* '\m(wa|t)\.me\M'
      or coalesce(txt, '') ~* 'whats[[:space:]]*app|telegram';
$$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role,                       -- null until onboarding is finished
  name text not null default '' check (char_length(name) <= 60),
  created_at timestamptz not null default now(),
  violation_count int not null default 0,
  suspended boolean not null default false
);

create table public.user_private (
  user_id uuid primary key references public.users (id) on delete cascade,
  phone text,
  email text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create table public.creator_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  age int not null check (age between 18 and 100),
  ig_handle text not null unique check (ig_handle ~ '^[a-z0-9._]{1,30}$'),
  followers int not null check (followers between 1000 and 10000),
  niche text not null,
  city text not null,
  -- Not in the original data model; needed for the brand-side
  -- "content type" and "budget" filters (see DECISIONS.md).
  content_types public.content_type[] not null default '{}',
  rate_bucket public.budget_bucket,
  bio text check (char_length(bio) <= 160 and not public.has_contact_info(bio)),
  portfolio text[] not null check (cardinality(portfolio) between 3 and 6),
  created_at timestamptz not null default now()
);

create table public.brand_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  brand_name text not null check (char_length(brand_name) between 1 and 60),
  industry text not null,
  ig_handle text not null unique check (ig_handle ~ '^[a-z0-9._]{1,30}$'),
  followers int not null check (followers >= 0),
  location text not null,
  audience_age_min int not null check (audience_age_min between 13 and 65),
  audience_age_max int not null check (audience_age_max between 13 and 65),
  about text check (char_length(about) <= 160 and not public.has_contact_info(about)),
  created_at timestamptz not null default now(),
  check (audience_age_min <= audience_age_max)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brand_profiles (user_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  brief text check (char_length(brief) <= 500),
  content_type public.content_type not null,
  comp_type public.comp_type not null,
  budget_bucket public.budget_bucket not null,
  deadline date not null,
  niche text not null,
  slots int not null check (slots between 1 and 50),
  slots_filled int not null default 0,
  status public.campaign_status not null default 'open',
  created_at timestamptz not null default now(),
  check ((comp_type = 'barter') = (budget_bucket = 'Barter')),
  check (not public.has_contact_info(title || ' ' || coalesce(brief, '')))
);
create index campaigns_open_idx on public.campaigns (status, created_at desc);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns (id) on delete set null,
  brand_id uuid not null references public.brand_profiles (user_id) on delete cascade,
  creator_id uuid not null references public.creator_profiles (user_id) on delete cascade,
  initiated_by uuid not null references public.users (id),
  deliverable text not null check (char_length(deliverable) between 2 and 120),
  content_type public.content_type not null,
  comp_type public.comp_type not null,
  amount int check (amount between 1 and 10000000),     -- ₹; null for pure barter
  deadline date not null,
  note text check (char_length(note) <= 140),
  counter_amount int check (counter_amount between 1 and 10000000),
  countered_by uuid references public.users (id),
  status public.request_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (initiated_by in (brand_id, creator_id)),
  check ((comp_type = 'barter') = (amount is null)),
  check (not public.has_contact_info(deliverable || ' ' || coalesce(note, '')))
);
create index requests_brand_idx on public.requests (brand_id, created_at desc);
create index requests_creator_idx on public.requests (creator_id, created_at desc);
-- A creator can only have one live application per campaign.
create unique index requests_one_live_per_campaign
  on public.requests (campaign_id, creator_id)
  where campaign_id is not null and status in ('requested', 'countered', 'accepted');

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  brand_id uuid not null references public.brand_profiles (user_id),
  creator_id uuid not null references public.creator_profiles (user_id),
  comp_type public.comp_type not null,
  -- Agreed ₹ amount (counter amount if one was accepted). Kept on the deal
  -- so in-app payments can hang off it later.
  amount int,
  status public.deal_status not null default 'in_progress',
  post_url text,
  posted_at timestamptz,
  payment_received_at timestamptz,
  completed_at timestamptz,
  auto_completed boolean not null default false,
  disputed_at timestamptz,
  dispute_reason text check (char_length(dispute_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_brand_idx on public.deals (brand_id, created_at desc);
create index deals_creator_idx on public.deals (creator_id, created_at desc);
create index deals_posted_idx on public.deals (status, posted_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  sender_id uuid not null references public.users (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_deal_idx on public.messages (deal_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  reviewer_id uuid not null references public.users (id),
  reviewee_id uuid not null references public.users (id),
  stars int not null check (stars between 1 and 5),
  text text check (char_length(text) <= 140 and not public.has_contact_info(text)),
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  deal_id uuid references public.deals (id) on delete cascade,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------
create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.role is not null and not u.suspended from public.users u where u.id = auth.uid()),
    false);
$$;

-- Raises a friendly error unless the caller is signed in, onboarded and not suspended.
create or replace function public.assert_active()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  select * into v_user from public.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if v_user.role is null then
    raise exception 'Please finish setting up your profile first.';
  end if;
  if v_user.suspended then
    raise exception 'Your account is suspended for repeatedly trying to share contact details. Contact Align support to appeal.';
  end if;
  return v_user.id;
end;
$$;

create or replace function public.display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select b.brand_name from public.brand_profiles b where b.user_id = p_user_id),
    (select nullif(u.name, '') from public.users u where u.id = p_user_id),
    'Someone');
$$;

create or replace function public.inr(p_amount int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_amount is null then 'Barter' else '₹' || to_char(p_amount, 'FM99,99,99,999') end;
$$;

-- ---------------------------------------------------------------------
-- Auth hook: every auth user gets a users row + a private contact row.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60));
  insert into public.user_private (user_id, phone, email)
  values (new.id, new.phone, nullif(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_private
     set phone = coalesce(new.phone, phone),
         email = coalesce(nullif(new.email, ''), email)
   where user_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_contact_changed
  after update of phone, email on auth.users
  for each row execute function public.handle_auth_user_contact_change();

-- ---------------------------------------------------------------------
-- Onboarding (validations are enforced here, not just in the UI)
-- ---------------------------------------------------------------------
create or replace function public.normalize_handle(p_handle text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(trim(coalesce(p_handle, '')), '^@+', ''));
$$;

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
  if p_followers is null or p_followers < 1000 or p_followers > 10000 then
    raise exception 'Align is built for creators with 1K–10K followers right now. Thanks for your interest, and do check back if that changes!';
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
  p_about text
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
  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'That doesn''t look like a valid Instagram handle.';
  end if;
  if exists (select 1 from public.brand_profiles where ig_handle = v_handle) then
    raise exception 'That Instagram handle is already registered on Align.';
  end if;

  update public.users set role = 'brand', name = left(trim(p_name), 60) where id = v_uid;
  update public.user_private set email = coalesce(nullif(trim(p_email), ''), email) where user_id = v_uid;
  insert into public.brand_profiles
    (user_id, brand_name, industry, ig_handle, followers, location, audience_age_min, audience_age_max, about)
  values
    (v_uid, trim(p_brand_name), p_industry, v_handle, coalesce(p_followers, 0), p_location,
     p_audience_age_min, p_audience_age_max, nullif(trim(p_about), ''));
end;
$$;

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create or replace function public.notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text, p_deal_id uuid default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link, deal_id)
  values (p_user_id, p_type, p_title, p_body, p_link, p_deal_id);
$$;

-- Fires the email edge function (Resend) for every new notification, when
-- configured. Set the two Vault secrets described in the README to enable.
create or replace function public.dispatch_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_email_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_email_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- Email is best-effort; never block the in-site notification.
  return new;
end;
$$;

create trigger notifications_email
  after insert on public.notifications
  for each row execute function public.dispatch_notification_email();

-- ---------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------
create or replace function public.campaigns_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Reopening needs a free slot and a future deadline.
  if new.status = 'open' and old.status = 'closed'
     and (new.slots_filled >= new.slots or new.deadline < current_date) then
    raise exception 'This campaign can''t be reopened: its slots are full or its deadline has passed.';
  end if;
  if new.slots < old.slots_filled then
    raise exception 'Slots can''t be lower than the number of creators already booked.';
  end if;
  return new;
end;
$$;

create trigger campaigns_guard
  before update on public.campaigns
  for each row execute function public.campaigns_guard();

-- ---------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------
create or replace function public.send_brand_request(
  p_creator_id uuid,
  p_deliverable text,
  p_content_type public.content_type,
  p_comp_type public.comp_type,
  p_amount int,
  p_deadline date,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_active();
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
  if public.has_contact_info(p_deliverable || ' ' || coalesce(p_note, '')) then
    raise exception 'Sharing contact details isn''t allowed on Align.';
  end if;

  insert into public.requests
    (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values
    (v_uid, p_creator_id, v_uid, trim(p_deliverable), p_content_type, p_comp_type,
     case when p_comp_type = 'barter' then null else p_amount end,
     p_deadline, nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;

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
    (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values
    (v_c.id, v_c.brand_id, v_uid, v_uid, v_c.title, v_c.content_type, v_c.comp_type,
     case when v_c.comp_type = 'barter' then null else p_quote end,
     v_c.deadline, nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Accept / decline / counter. Rules:
--  * status 'requested': only the receiver may act (accept, decline, or one counter on price)
--  * status 'countered': only the original sender may act (accept or decline)
create or replace function public.respond_request(
  p_request_id uuid,
  p_action text,
  p_counter_amount int default null
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
       set status = 'countered', counter_amount = p_counter_amount, countered_by = v_uid, updated_at = now()
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

  update public.requests set status = 'accepted', updated_at = now() where id = v_r.id;
  select id into v_deal_id from public.deals where request_id = v_r.id;  -- created by trigger
  return v_deal_id;
end;
$$;

-- Deal is created automatically whenever a request becomes accepted.
create or replace function public.requests_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_other uuid;
  v_deal_id uuid;
  v_amount int;
begin
  if new.status = old.status then
    return new;
  end if;

  -- The party who did NOT act gets notified (both, when acting outside a user session).
  if new.status = 'countered' then
    perform public.notify(new.initiated_by, 'request_countered',
      public.display_name(new.countered_by) || ' sent a counter-offer',
      'They proposed ' || public.inr(new.counter_amount) || ' for "' || new.deliverable || '". Accept or decline.',
      '/requests?tab=sent');
  elsif new.status = 'declined' then
    v_other := case when old.status = 'requested' then new.initiated_by else new.countered_by end;
    perform public.notify(v_other, 'request_declined',
      public.display_name(case when v_other = new.brand_id then new.creator_id else new.brand_id end) || ' declined your request',
      '"' || new.deliverable || '" won''t go ahead. Keep exploring, the right match is out there.',
      '/requests?tab=' || case when v_other = new.initiated_by then 'sent' else 'received' end);
  elsif new.status = 'accepted' then
    v_amount := case when old.status = 'countered' then new.counter_amount else new.amount end;
    insert into public.deals (request_id, brand_id, creator_id, comp_type, amount)
    values (new.id, new.brand_id, new.creator_id, new.comp_type, v_amount)
    returning id into v_deal_id;

    if new.campaign_id is not null then
      update public.campaigns
         set slots_filled = slots_filled + 1,
             status = case when slots_filled + 1 >= slots then 'closed'::public.campaign_status else status end
       where id = new.campaign_id;
    end if;

    if v_actor is distinct from new.brand_id then
      perform public.notify(new.brand_id, 'request_accepted',
        'Deal on! ' || public.display_name(new.creator_id) || ' accepted',
        '"' || new.deliverable || '" is now in progress. Say hi in the deal chat.',
        '/deals/' || v_deal_id, v_deal_id);
    end if;
    if v_actor is distinct from new.creator_id then
      perform public.notify(new.creator_id, 'request_accepted',
        'Deal on! ' || public.display_name(new.brand_id) || ' accepted',
        '"' || new.deliverable || '" is now in progress. Check the deal chat for the brief.',
        '/deals/' || v_deal_id, v_deal_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger requests_after_update
  after update on public.requests
  for each row execute function public.requests_after_update();

create or replace function public.requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'requested' then
    return new;  -- seeded history
  end if;
  if new.initiated_by = new.brand_id then
    perform public.notify(new.creator_id, 'request_new',
      'New request from ' || public.display_name(new.brand_id),
      '"' || new.deliverable || '" · ' || public.inr(new.amount),
      '/requests?tab=received');
  else
    perform public.notify(new.brand_id, 'request_new',
      public.display_name(new.creator_id) || ' applied to your campaign',
      '"' || new.deliverable || '" · quote ' || public.inr(new.amount),
      '/requests?tab=received');
  end if;
  return new;
end;
$$;

create trigger requests_after_insert
  after insert on public.requests
  for each row execute function public.requests_after_insert();

-- ---------------------------------------------------------------------
-- Deal lifecycle
-- ---------------------------------------------------------------------
-- The one function that moves a deal. Who may do what:
--   in_progress      -> posted            creator, with post URL
--   posted           -> payment_received  creator (paid / both only)
--   posted (barter)  -> completed         brand
--   payment_received -> completed         brand
--   posted | payment_received -> disputed brand
-- (posted | payment_received -> completed also happens via auto_complete_deals)
create or replace function public.update_deal_status(
  p_deal_id uuid,
  p_status public.deal_status,
  p_post_url text default null,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_active();
  v_d public.deals;
  v_is_creator boolean;
  v_is_brand boolean;
  v_barter boolean;
  v_url text := trim(coalesce(p_post_url, ''));
begin
  select * into v_d from public.deals where id = p_deal_id for update;
  if v_d.id is null or v_uid not in (v_d.brand_id, v_d.creator_id) then
    raise exception 'Deal not found.';
  end if;
  v_is_creator := v_uid = v_d.creator_id;
  v_is_brand := v_uid = v_d.brand_id;
  v_barter := v_d.comp_type = 'barter';

  if v_d.status = 'in_progress' and p_status = 'posted' and v_is_creator then
    if v_url !~* '^https?://[^[:space:]]+\.[^[:space:]]+$' then
      raise exception 'Please paste the link to your post.';
    end if;
    update public.deals set status = 'posted', post_url = v_url, posted_at = now(), updated_at = now()
     where id = v_d.id;

  elsif v_d.status = 'posted' and p_status = 'payment_received' and v_is_creator and not v_barter then
    update public.deals set status = 'payment_received', payment_received_at = now(), updated_at = now()
     where id = v_d.id;

  elsif p_status = 'completed' and v_is_brand
        and ((v_d.status = 'posted' and v_barter) or v_d.status = 'payment_received') then
    update public.deals set status = 'completed', completed_at = now(), updated_at = now()
     where id = v_d.id;

  elsif p_status = 'disputed' and v_is_brand and v_d.status in ('posted', 'payment_received') then
    update public.deals set status = 'disputed', disputed_at = now(), updated_at = now(),
           dispute_reason = nullif(left(trim(coalesce(p_reason, '')), 300), '')
     where id = v_d.id;

  else
    raise exception 'That status change isn''t allowed.';
  end if;
end;
$$;

-- Defence in depth: whatever path updates a deal, the status graph holds.
-- Admin tooling (no auth.uid(), e.g. SQL editor) may resolve disputes.
create or replace function public.deals_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if (old.status, new.status) in (
      ('in_progress'::public.deal_status, 'posted'::public.deal_status),
      ('posted', 'payment_received'),
      ('posted', 'completed'),
      ('payment_received', 'completed'),
      ('posted', 'disputed'),
      ('payment_received', 'disputed'))
     or (auth.uid() is null and old.status = 'disputed') then
    if new.status = 'posted' and (new.post_url is null or new.posted_at is null) then
      raise exception 'A posted deal needs a post URL.';
    end if;
    return new;
  end if;
  raise exception 'Invalid deal status change: % -> %', old.status, new.status;
end;
$$;

create trigger deals_guard
  before update of status on public.deals
  for each row execute function public.deals_guard();

create or replace function public.deals_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deliverable text;
  v_link text := '/deals/' || new.id;
begin
  if new.status = old.status then
    return new;
  end if;
  select deliverable into v_deliverable from public.requests where id = new.request_id;

  if new.status = 'posted' then
    perform public.notify(new.brand_id, 'deal_status',
      public.display_name(new.creator_id) || ' posted the content',
      '"' || v_deliverable || '" is live. Take a look at the post.', v_link, new.id);
  elsif new.status = 'payment_received' then
    perform public.notify(new.brand_id, 'deal_status',
      public.display_name(new.creator_id) || ' confirmed payment received',
      'Please confirm the deal is complete.', v_link, new.id);
  elsif new.status = 'disputed' then
    perform public.notify(new.creator_id, 'deal_status',
      public.display_name(new.brand_id) || ' raised a dispute',
      'The Align team will review "' || v_deliverable || '" and get in touch.', v_link, new.id);
  elsif new.status = 'completed' then
    perform public.notify(new.creator_id, 'rate',
      'Deal complete! Rate ' || public.display_name(new.brand_id),
      'How was working on "' || v_deliverable || '"? Leave a quick rating.', v_link, new.id);
    perform public.notify(new.brand_id, 'rate',
      'Deal complete! Rate ' || public.display_name(new.creator_id),
      'How was working on "' || v_deliverable || '"? Leave a quick rating.', v_link, new.id);
  end if;
  return new;
end;
$$;

create trigger deals_after_update
  after update on public.deals
  for each row execute function public.deals_after_update();

-- Daily: a deal sitting at posted / payment_received for 7 days with no
-- dispute completes automatically.
create or replace function public.auto_complete_deals()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.deals
     set status = 'completed', completed_at = now(), auto_completed = true, updated_at = now()
   where status in ('posted', 'payment_received')
     and posted_at <= now() - interval '7 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Daily: remind both sides 2 days before an in-progress deal's deadline.
create or replace function public.send_deadline_reminders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count int := 0;
begin
  for v_row in
    select d.id, d.brand_id, d.creator_id, r.deliverable, r.deadline
      from public.deals d join public.requests r on r.id = d.request_id
     where d.status = 'in_progress' and r.deadline = current_date + 2
  loop
    perform public.notify(v_row.creator_id, 'reminder', 'Deadline in 2 days',
      '"' || v_row.deliverable || '" is due on ' || to_char(v_row.deadline, 'DD Mon') || '.',
      '/deals/' || v_row.id, v_row.id);
    perform public.notify(v_row.brand_id, 'reminder', 'Deadline in 2 days',
      '"' || v_row.deliverable || '" is due on ' || to_char(v_row.deadline, 'DD Mon') || '.',
      '/deals/' || v_row.id, v_row.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('align-auto-complete-deals', '30 0 * * *', 'select public.auto_complete_deals()');
select cron.schedule('align-deadline-reminders', '30 3 * * *', 'select public.send_deadline_reminders()'); -- 09:00 IST

-- ---------------------------------------------------------------------
-- Deal chat
-- ---------------------------------------------------------------------
-- Returns {ok: true, id} or {ok: false, error, message, violations, suspended}.
-- Returns rather than raises so the violation counter update is committed.
create or replace function public.send_message(p_deal_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user public.users;
  v_body text := trim(coalesce(p_body, ''));
  v_count int;
  v_id uuid;
begin
  select * into v_user from public.users where id = v_uid;
  if v_user.id is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.deals where id = p_deal_id and v_uid in (brand_id, creator_id)) then
    raise exception 'Deal not found.';
  end if;
  if v_user.suspended then
    return jsonb_build_object('ok', false, 'error', 'suspended', 'suspended', true,
      'message', 'Your account is suspended for repeatedly trying to share contact details.');
  end if;
  if char_length(v_body) = 0 or char_length(v_body) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'message', 'Messages must be 1–1000 characters.');
  end if;

  if public.has_contact_info(v_body) then
    update public.users
       set violation_count = violation_count + 1,
           suspended = violation_count + 1 >= 3
     where id = v_uid
     returning violation_count into v_count;
    return jsonb_build_object('ok', false, 'error', 'contact_info',
      'message', 'Sharing contact details isn''t allowed on Align.',
      'violations', v_count, 'suspended', v_count >= 3);
  end if;

  insert into public.messages (deal_id, sender_id, body) values (p_deal_id, v_uid, v_body)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Belt and braces: no path can store a message with contact details.
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.has_contact_info(new.body) then
    raise exception 'Sharing contact details isn''t allowed on Align.';
  end if;
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.deals;
  v_to uuid;
begin
  select * into v_d from public.deals where id = new.deal_id;
  v_to := case when new.sender_id = v_d.brand_id then v_d.creator_id else v_d.brand_id end;
  -- One unread chat notification per deal at a time, so the bell (and email) isn't spammed.
  if exists (
    select 1 from public.notifications
     where user_id = v_to and deal_id = new.deal_id and type = 'message' and read_at is null
  ) then
    return new;
  end if;
  perform public.notify(v_to, 'message',
    'New message from ' || public.display_name(new.sender_id),
    left(new.body, 120), '/deals/' || new.deal_id, new.deal_id);
  return new;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- ---------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------
create or replace function public.submit_review(p_deal_id uuid, p_stars int, p_text text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_d public.deals;
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  select * into v_d from public.deals where id = p_deal_id;
  if v_d.id is null or v_uid not in (v_d.brand_id, v_d.creator_id) then
    raise exception 'Deal not found.';
  end if;
  if v_d.status <> 'completed' then
    raise exception 'You can rate once the deal is completed.';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'Please choose 1 to 5 stars.';
  end if;
  if char_length(coalesce(p_text, '')) > 140 then
    raise exception 'Reviews can be up to 140 characters.';
  end if;
  if public.has_contact_info(p_text) then
    raise exception 'Sharing contact details isn''t allowed on Align.';
  end if;
  if exists (select 1 from public.reviews where deal_id = p_deal_id and reviewer_id = v_uid) then
    raise exception 'You''ve already rated this deal.';
  end if;
  insert into public.reviews (deal_id, reviewer_id, reviewee_id, stars, text)
  values (p_deal_id, v_uid,
          case when v_uid = v_d.brand_id then v_d.creator_id else v_d.brand_id end,
          p_stars, nullif(trim(p_text), ''));
end;
$$;

-- ---------------------------------------------------------------------
-- Read models (security_invoker: the caller's RLS applies)
-- ---------------------------------------------------------------------
create view public.user_ratings with (security_invoker = true) as
  select reviewee_id as user_id,
         round(avg(stars)::numeric, 1) as avg_stars,
         count(*)::int as review_count
    from public.reviews
   group by reviewee_id;

create view public.creator_cards with (security_invoker = true) as
  select c.user_id, u.name, c.age, c.ig_handle, c.followers, c.niche, c.city,
         c.content_types, c.rate_bucket, c.bio, c.portfolio, c.created_at,
         coalesce(r.avg_stars, 0) as avg_stars, coalesce(r.review_count, 0) as review_count
    from public.creator_profiles c
    join public.users u on u.id = c.user_id
    left join public.user_ratings r on r.user_id = c.user_id
   where not u.suspended;

create view public.brand_cards with (security_invoker = true) as
  select b.user_id, u.name as contact_name, b.brand_name, b.industry, b.ig_handle, b.followers,
         b.location, b.audience_age_min, b.audience_age_max, b.about, b.created_at,
         coalesce(r.avg_stars, 0) as avg_stars, coalesce(r.review_count, 0) as review_count
    from public.brand_profiles b
    join public.users u on u.id = b.user_id
    left join public.user_ratings r on r.user_id = b.user_id;

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
  select d.*, q.deliverable, q.content_type, q.deadline, q.note, q.campaign_id,
         b.brand_name, u.name as creator_name, cp.ig_handle as creator_ig_handle
    from public.deals d
    join public.requests q on q.id = d.request_id
    join public.brand_profiles b on b.user_id = d.brand_id
    join public.creator_profiles cp on cp.user_id = d.creator_id
    join public.users u on u.id = d.creator_id;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.user_private enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.requests enable row level security;
alter table public.deals enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

create policy users_read on public.users for select to authenticated using (true);
create policy users_update_own on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_private_owner_read on public.user_private for select to authenticated
  using (user_id = auth.uid());
create policy user_private_owner_update on public.user_private for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy creator_profiles_read on public.creator_profiles for select to authenticated using (true);
create policy creator_profiles_update_own on public.creator_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy brand_profiles_read on public.brand_profiles for select to authenticated using (true);
create policy brand_profiles_update_own on public.brand_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy campaigns_read on public.campaigns for select to authenticated using (true);
create policy campaigns_insert_own on public.campaigns for insert to authenticated
  with check (brand_id = auth.uid() and public.is_active() and status = 'open'
              and slots_filled = 0 and deadline >= current_date);
create policy campaigns_update_own on public.campaigns for update to authenticated
  using (brand_id = auth.uid()) with check (brand_id = auth.uid());

create policy requests_parties_read on public.requests for select to authenticated
  using (auth.uid() in (brand_id, creator_id));

create policy deals_parties_read on public.deals for select to authenticated
  using (auth.uid() in (brand_id, creator_id));

create policy messages_parties_read on public.messages for select to authenticated
  using (exists (select 1 from public.deals d
                  where d.id = messages.deal_id and auth.uid() in (d.brand_id, d.creator_id)));

create policy reviews_read on public.reviews for select to authenticated using (true);

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Grants. Start from nothing, then open exactly what the app needs.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select (id, role, name, created_at, suspended) on public.users to authenticated;
grant update (name) on public.users to authenticated;

grant select (user_id, phone, email) on public.user_private to authenticated;
grant update (email) on public.user_private to authenticated;

grant select on public.creator_profiles to authenticated;
grant update (followers, niche, city, content_types, rate_bucket, bio, portfolio)
  on public.creator_profiles to authenticated;

grant select on public.brand_profiles to authenticated;
grant update (brand_name, industry, followers, location, audience_age_min, audience_age_max, about)
  on public.brand_profiles to authenticated;

grant select on public.campaigns to authenticated;
grant insert (brand_id, title, brief, content_type, comp_type, budget_bucket, deadline, niche, slots)
  on public.campaigns to authenticated;
grant update (title, brief, deadline, slots, status) on public.campaigns to authenticated;

grant select on public.requests, public.deals, public.messages, public.reviews to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.user_ratings, public.creator_cards, public.brand_cards,
  public.campaign_cards, public.request_cards, public.deal_cards to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.has_contact_info(text),
  public.is_active(),
  public.display_name(uuid),
  public.inr(int),
  public.normalize_handle(text),
  public.complete_creator_onboarding(text, text, int, text, int, text, text, public.content_type[], public.budget_bucket, text, text[]),
  public.complete_brand_onboarding(text, text, boolean, text, text, text, int, text, int, int, text),
  public.send_brand_request(uuid, text, public.content_type, public.comp_type, int, date, text),
  public.apply_to_campaign(uuid, int, text),
  public.respond_request(uuid, text, int),
  public.update_deal_status(uuid, public.deal_status, text, text),
  public.send_message(uuid, text),
  public.submit_review(uuid, int, text)
to authenticated;

-- ---------------------------------------------------------------------
-- Realtime (chat, bell, live deal status)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.deals;

-- ---------------------------------------------------------------------
-- Storage: portfolio uploads. Public read; users write only to their own folder.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy portfolio_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy portfolio_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
