-- =====================================================================
-- Admin panel (client request, 2026-10-14).
-- Admins are normal auth users with users.is_admin = true. That flag can
-- only be set from the database (no grant lets anyone change it), and every
-- admin function checks it server-side.
--
-- Make someone an admin (SQL editor):
--   update public.users set is_admin = true
--    where id = (select id from auth.users where phone = '91XXXXXXXXXX');
-- =====================================================================

alter table public.users add column is_admin boolean not null default false;

alter table public.deals
  add column resolved_at timestamptz,
  add column resolved_by uuid references public.users (id),
  add column resolution_note text check (char_length(resolution_note) <= 500);

alter table public.creator_profiles add column followers_checked_at timestamptz;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_admin from public.users u where u.id = auth.uid()), false);
$$;

create or replace function public.assert_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- Admins (and the SQL editor) may move a deal out of 'disputed'.
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
     or (old.status = 'disputed' and (auth.uid() is null or public.is_admin())) then
    if new.status = 'posted' and (new.post_url is null or new.posted_at is null) then
      raise exception 'A posted deal needs a post URL.';
    end if;
    return new;
  end if;
  raise exception 'Invalid deal status change: % -> %', old.status, new.status;
end;
$$;

-- Status notifications: resolutions send their own messages (see admin_resolve_dispute),
-- except "completed", which still prompts both sides to rate.
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
  if old.status = 'disputed' and new.status <> 'completed' then
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
-- Read functions for the admin panel
-- ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'creators', (select count(*) from public.users where role = 'creator'),
    'brands', (select count(*) from public.users where role = 'brand'),
    'open_campaigns', (select count(*) from public.campaigns where status = 'open' and deadline >= current_date),
    'pending_requests', (select count(*) from public.requests where status in ('requested', 'countered')),
    'deals', (select coalesce(jsonb_object_agg(status, n), '{}') from
               (select status, count(*) n from public.deals group by status) s),
    'open_payment_reports', (select count(*) from public.deals where status = 'disputed' and dispute_type = 'payment'),
    'open_content_disputes', (select count(*) from public.deals where status = 'disputed' and coalesce(dispute_type, 'content') = 'content'),
    'overdue_payments', (select count(*) from public.deals where status = 'posted' and payment_overdue_at is not null),
    'suspended_users', (select count(*) from public.users where suspended),
    'unchecked_creators', (select count(*) from public.creator_profiles where followers_checked_at is null),
    'paid_value_completed', (select coalesce(sum(amount), 0) from public.deals where status = 'completed')
  );
end;
$$;

create or replace function public.admin_disputes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.disputed_at desc)
      from (
        select d.id, d.status, d.dispute_type, d.dispute_reason, d.disputed_at, d.amount, d.comp_type,
               d.post_url, d.posted_at, d.payment_overdue_at,
               q.deliverable, q.deadline, q.brand_agreed_at, q.brand_terms_version,
               b.brand_name, bu.name as brand_contact, bp.phone as brand_phone, bp.email as brand_email,
               cu.name as creator_name, cp.ig_handle as creator_ig, cpr.phone as creator_phone, cpr.email as creator_email,
               (d.disputed_by = d.creator_id) as raised_by_creator
          from public.deals d
          join public.requests q on q.id = d.request_id
          join public.brand_profiles b on b.user_id = d.brand_id
          join public.users bu on bu.id = d.brand_id
          join public.user_private bp on bp.user_id = d.brand_id
          join public.users cu on cu.id = d.creator_id
          join public.creator_profiles cp on cp.user_id = d.creator_id
          join public.user_private cpr on cpr.user_id = d.creator_id
         where d.status = 'disputed') x), '[]');
end;
$$;

create or replace function public.admin_deal_messages(p_deal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object('sender', public.display_name(m.sender_id), 'body', m.body, 'at', m.created_at)
                     order by m.created_at)
      from public.messages m where m.deal_id = p_deal_id), '[]');
end;
$$;

create or replace function public.admin_users(p_search text default null, p_filter text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := '%' || lower(trim(coalesce(p_search, ''))) || '%';
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.suspended desc, x.violation_count desc, x.created_at desc)
      from (
        select u.id, u.role, u.name, u.violation_count, u.suspended, u.created_at,
               p.phone, p.email,
               b.brand_name, coalesce(c.ig_handle, b.ig_handle) as ig_handle,
               coalesce(c.followers, b.followers) as followers,
               c.niche, c.city, c.followers_checked_at,
               (select count(*) from public.deals d where u.id in (d.brand_id, d.creator_id)) as deals
          from public.users u
          join public.user_private p on p.user_id = u.id
          left join public.creator_profiles c on c.user_id = u.id
          left join public.brand_profiles b on b.user_id = u.id
         where u.role is not null
           and (p_filter = 'all'
                or (p_filter = 'suspended' and u.suspended)
                or (p_filter = 'warned' and u.violation_count > 0)
                or (p_filter = 'unchecked' and u.role = 'creator' and c.followers_checked_at is null)
                or (p_filter = 'creators' and u.role = 'creator')
                or (p_filter = 'brands' and u.role = 'brand'))
           and (v_q = '%%'
                or lower(u.name) like v_q or lower(coalesce(b.brand_name, '')) like v_q
                or lower(coalesce(c.ig_handle, b.ig_handle, '')) like v_q or coalesce(p.phone, '') like v_q)
         limit 200) x), '[]');
end;
$$;

-- ---------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------
-- p_outcome: 'completed' (close the deal, e.g. brand has now paid),
--            'posted' (dispute rejected: content stands, a new 7-day payment window starts),
--            'in_progress' (creator redoes the content).
create or replace function public.admin_resolve_dispute(p_deal_id uuid, p_outcome text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.assert_admin();
  v_d public.deals;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_deliverable text;
  v_msg text;
begin
  select * into v_d from public.deals where id = p_deal_id for update;
  if v_d.id is null or v_d.status <> 'disputed' then
    raise exception 'That deal is not in dispute.';
  end if;
  if v_note is null then
    raise exception 'Please add a short note explaining the decision. Both sides will see it.';
  end if;
  select deliverable into v_deliverable from public.requests where id = v_d.request_id;

  if p_outcome = 'completed' then
    update public.deals set status = 'completed', completed_at = now(), updated_at = now(),
           resolved_at = now(), resolved_by = v_admin, resolution_note = left(v_note, 500)
     where id = v_d.id;
    v_msg := 'Align closed the dispute and marked the deal complete.';
  elsif p_outcome = 'posted' then
    update public.deals set status = 'posted', posted_at = now(), payment_overdue_at = null, updated_at = now(),
           resolved_at = now(), resolved_by = v_admin, resolution_note = left(v_note, 500)
     where id = v_d.id;
    v_msg := 'Align reviewed the dispute. The post stands, and payment is due within 7 days.';
  elsif p_outcome = 'in_progress' then
    update public.deals set status = 'in_progress', post_url = null, posted_at = null, payment_overdue_at = null,
           updated_at = now(), resolved_at = now(), resolved_by = v_admin, resolution_note = left(v_note, 500)
     where id = v_d.id;
    v_msg := 'Align reviewed the dispute. The creator will revise the content and post it again.';
  else
    raise exception 'Unknown outcome.';
  end if;

  perform public.notify(v_d.brand_id, 'dispute_resolved', 'Dispute resolved: "' || v_deliverable || '"',
    v_msg || ' Note from Align: ' || v_note, '/deals/' || v_d.id, v_d.id);
  perform public.notify(v_d.creator_id, 'dispute_resolved', 'Dispute resolved: "' || v_deliverable || '"',
    v_msg || ' Note from Align: ' || v_note, '/deals/' || v_d.id, v_d.id);
end;
$$;

create or replace function public.admin_set_suspended(p_user_id uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_user_id = auth.uid() then
    raise exception 'You can''t suspend your own account.';
  end if;
  update public.users
     set suspended = p_suspended,
         violation_count = case when p_suspended then violation_count else 0 end
   where id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;
  perform public.notify(p_user_id, 'account',
    case when p_suspended then 'Your account has been suspended' else 'Your account is active again' end,
    case when p_suspended then 'Contact Align support if you think this is a mistake.'
         else 'Welcome back! Please keep all coordination inside Align.' end,
    '/home');
end;
$$;

create or replace function public.admin_mark_followers_checked(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.creator_profiles set followers_checked_at = now() where user_id = p_user_id;
  if not found then
    raise exception 'Creator not found.';
  end if;
end;
$$;

-- Deal Card shows the resolution note.
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

-- ---------------------------------------------------------------------
-- Grants: callable by signed-in users, but each checks is_admin() itself.
-- ---------------------------------------------------------------------
revoke execute on function
  public.is_admin(), public.assert_admin(), public.admin_overview(), public.admin_disputes(),
  public.admin_deal_messages(uuid), public.admin_users(text, text),
  public.admin_resolve_dispute(uuid, text, text), public.admin_set_suspended(uuid, boolean),
  public.admin_mark_followers_checked(uuid)
from public, anon;
grant execute on function
  public.is_admin(), public.admin_overview(), public.admin_disputes(),
  public.admin_deal_messages(uuid), public.admin_users(text, text),
  public.admin_resolve_dispute(uuid, text, text), public.admin_set_suspended(uuid, boolean),
  public.admin_mark_followers_checked(uuid)
to authenticated;
