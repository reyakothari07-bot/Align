-- =====================================================================
-- Payment protection for creators (client request, 2026-10-14):
--  1. Paid deals no longer auto-complete while unpaid. Only barter deals and
--     deals where the creator confirmed payment auto-complete after 7 days.
--     Unpaid paid deals are flagged overdue 7 days after posting instead.
--  2. Creators can report non-payment once a payment is overdue. Brands with
--     open non-payment reports are flagged on their profile and campaigns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Deals: who raised a dispute, what kind, and when payment became overdue
-- ---------------------------------------------------------------------
alter table public.deals
  add column disputed_by uuid references public.users (id),
  add column dispute_type text check (dispute_type in ('content', 'payment')),
  add column payment_overdue_at timestamptz;

-- Every dispute so far was raised by a brand about the content.
update public.deals set disputed_by = brand_id, dispute_type = 'content' where status = 'disputed';

-- ---------------------------------------------------------------------
-- Status changes: creators may report non-payment once it's overdue
-- ---------------------------------------------------------------------
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
  v_due timestamptz;
begin
  select * into v_d from public.deals where id = p_deal_id for update;
  if v_d.id is null or v_uid not in (v_d.brand_id, v_d.creator_id) then
    raise exception 'Deal not found.';
  end if;
  v_is_creator := v_uid = v_d.creator_id;
  v_is_brand := v_uid = v_d.brand_id;
  v_barter := v_d.comp_type = 'barter';
  v_due := v_d.posted_at + interval '7 days';

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
           disputed_by = v_uid, dispute_type = 'content',
           dispute_reason = nullif(left(trim(coalesce(p_reason, '')), 300), '')
     where id = v_d.id;

  -- Creator reports non-payment: paid deals only, once the 7-day payment window has passed.
  elsif p_status = 'disputed' and v_is_creator and v_d.status = 'posted' and not v_barter then
    if now() < v_due then
      raise exception 'The brand has until % to pay. You can report non-payment after that.',
        to_char(v_due at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM');
    end if;
    update public.deals set status = 'disputed', disputed_at = now(), updated_at = now(),
           disputed_by = v_uid, dispute_type = 'payment',
           dispute_reason = nullif(left(trim(coalesce(p_reason, '')), 300), '')
     where id = v_d.id;

  else
    raise exception 'That status change isn''t allowed.';
  end if;
end;
$$;

-- Notifications: a dispute now goes to whoever didn't raise it.
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
      '"' || v_deliverable || '" is live. Please pay ' || public.inr(new.amount) || ' within 7 days.', v_link, new.id);
  elsif new.status = 'payment_received' then
    perform public.notify(new.brand_id, 'deal_status',
      public.display_name(new.creator_id) || ' confirmed payment received',
      'Please confirm the deal is complete.', v_link, new.id);
  elsif new.status = 'disputed' and new.dispute_type = 'payment' then
    perform public.notify(new.brand_id, 'deal_status',
      public.display_name(new.creator_id) || ' reported that you haven''t paid',
      'The Align team will review "' || v_deliverable || '". Pay ' || public.inr(new.amount) || ' to the creator as soon as possible.',
      v_link, new.id);
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

-- ---------------------------------------------------------------------
-- Daily jobs
-- ---------------------------------------------------------------------
-- Auto-complete only what is safe to close: barter deals, and deals the
-- creator has confirmed as paid. Unpaid paid deals stay open.
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
   where posted_at <= now() - interval '7 days'
     and ((status = 'posted' and comp_type = 'barter') or status = 'payment_received');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Paid deals still unpaid 7 days after posting: flag once and tell both sides.
create or replace function public.flag_overdue_payments()
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
    update public.deals d
       set payment_overdue_at = now()
     where d.status = 'posted' and d.comp_type <> 'barter'
       and d.posted_at <= now() - interval '7 days'
       and d.payment_overdue_at is null
    returning d.id, d.brand_id, d.creator_id, d.amount, d.request_id
  loop
    perform public.notify(v_row.brand_id, 'payment_overdue',
      'Payment overdue to ' || public.display_name(v_row.creator_id),
      'You agreed to pay ' || public.inr(v_row.amount) || ' within 7 days of the content going live. Please pay now to avoid a report.',
      '/deals/' || v_row.id, v_row.id);
    perform public.notify(v_row.creator_id, 'payment_overdue',
      'Not paid yet by ' || public.display_name(v_row.brand_id) || '?',
      'The 7-day payment window has passed. If you haven''t received ' || public.inr(v_row.amount) || ', report it from the Deal Card.',
      '/deals/' || v_row.id, v_row.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('align-flag-overdue-payments', '45 3 * * *', 'select public.flag_overdue_payments()'); -- 09:15 IST

-- ---------------------------------------------------------------------
-- Open non-payment reports per brand (shown to everyone; deals themselves stay private)
-- ---------------------------------------------------------------------
create or replace function public.brand_open_payment_reports(p_brand_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.deals
   where brand_id = p_brand_id and status = 'disputed' and dispute_type = 'payment';
$$;

drop view public.brand_cards;
create view public.brand_cards with (security_invoker = true) as
  select b.user_id, u.name as contact_name, b.brand_name, b.industry, b.ig_handle, b.followers,
         b.location, b.audience_age_min, b.audience_age_max, b.about, b.created_at,
         coalesce(r.avg_stars, 0) as avg_stars, coalesce(r.review_count, 0) as review_count,
         public.brand_open_payment_reports(b.user_id) as open_payment_reports
    from public.brand_profiles b
    join public.users u on u.id = b.user_id
    left join public.user_ratings r on r.user_id = b.user_id;

drop view public.campaign_cards;
create view public.campaign_cards with (security_invoker = true) as
  select c.*, b.brand_name, b.industry, b.location, b.ig_handle as brand_ig_handle,
         coalesce(r.avg_stars, 0) as brand_avg_stars, coalesce(r.review_count, 0) as brand_review_count,
         public.brand_open_payment_reports(c.brand_id) as brand_open_payment_reports
    from public.campaigns c
    join public.brand_profiles b on b.user_id = c.brand_id
    left join public.user_ratings r on r.user_id = c.brand_id;

-- deal_cards uses d.*; rebuild so it includes the new columns.
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

grant select on public.brand_cards, public.campaign_cards, public.deal_cards to authenticated;

-- ---------------------------------------------------------------------
-- The Brand Terms now mention the non-payment report, so they get a new version.
-- ---------------------------------------------------------------------
create or replace function public.brand_terms_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '2026-10-14'::text $$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
revoke execute on function public.flag_overdue_payments() from public, anon, authenticated;
revoke execute on function public.brand_open_payment_reports(uuid) from public, anon;
grant execute on function public.brand_open_payment_reports(uuid) to authenticated;
