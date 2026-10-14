-- Run with: npm run test:db   (needs the seed loaded; everything rolls back)
begin;
create extension if not exists pgtap with schema extensions;
select plan(81);


create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.act_as_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Fixtures: fresh deals created inside this (rolled-back) transaction, so the tests
-- don't depend on how the live demo data has moved on (e.g. daily auto-complete).
insert into requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
values ('22222222-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000011',
        'Test fixture deal A', 'Reel', 'paid', 4000, current_date + 10),
       ('22222222-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000011',
        'Test fixture deal B', 'Reel', 'paid', 5000, current_date + 10),
       ('22222222-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000011',
        'Test fixture deal C', 'Story', 'paid', 3000, current_date + 10);
insert into requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
values ('22222222-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000011',
        'Test fixture deal D', 'Post', 'barter', null, current_date + 10);
-- A pending creator application to Nomad Bags, for the Brand Terms tests.
insert into requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
values ('22222222-0000-4000-8000-000000000015', '11111111-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000005',
        'Test fixture application', 'Reel', 'paid', 7000, current_date + 10);
update requests set status = 'accepted' where deliverable like 'Test fixture deal %';
update deals set status = 'posted', post_url = 'https://instagram.com/p/fixture', posted_at = now()
 where request_id = (select id from requests where deliverable = 'Test fixture deal B');
update deals set status = 'posted', post_url = 'https://instagram.com/p/fixture', posted_at = now() - interval '8 days'
 where request_id in (select id from requests where deliverable in ('Test fixture deal C', 'Test fixture deal D'));
create temp table fx as
select
  (select d.id from deals d join requests r on r.id = d.request_id where r.deliverable = 'Test fixture deal A') as aanya_deal,
  (select d.id from deals d join requests r on r.id = d.request_id where r.deliverable = 'Test fixture deal B') as priya_deal,
  (select d.id from deals d join requests r on r.id = d.request_id where r.deliverable = 'Test fixture deal C') as overdue_deal,
  (select d.id from deals d join requests r on r.id = d.request_id where r.deliverable = 'Test fixture deal D') as barter_deal;
grant select on fx to authenticated;

-- =====================================================================
-- 1. Contact details are never readable by another user
-- =====================================================================
select pg_temp.act_as('11111111-0000-4000-8000-000000000001');

select is((select count(*)::int from user_private), 1, 'user_private: a user sees exactly one row');
select is((select user_id from user_private), '11111111-0000-4000-8000-000000000001'::uuid, 'user_private: ...and it is their own');
select is((select count(*)::int from user_private where user_id <> auth.uid()), 0, 'user_private: no other users rows');
select throws_ok('select violation_count from users', '42501', null, 'users.violation_count is not readable');

-- No table or view the app can read has any other column holding phone/email.
select is(
  (select count(*)::int from information_schema.column_privileges p
     join information_schema.columns c using (table_schema, table_name, column_name)
    where p.grantee = 'authenticated' and p.table_schema = 'public' and p.privilege_type = 'SELECT'
      and c.data_type in ('text', 'character varying', 'ARRAY', 'jsonb')
      and (p.column_name ilike '%phone%' or p.column_name ilike '%email%')
      and p.table_name <> 'user_private'),
  0, 'no readable column other than user_private exposes phone/email');

-- And nothing readable contains another user's actual phone/email values.
select is(
  (select count(*)::int from (
      select to_jsonb(t)::text as j from creator_cards t union all
      select to_jsonb(t)::text from brand_cards t union all
      select to_jsonb(t)::text from campaign_cards t union all
      select to_jsonb(t)::text from request_cards t union all
      select to_jsonb(t)::text from deal_cards t union all
      select to_jsonb(t)::text from messages t union all
      select to_jsonb(t)::text from reviews t union all
      select to_jsonb(t)::text from notifications t
    ) rows
    where j ~ '9190000000(0[2-9]|1[0-5])' or j ~* '@example\.com'),
  0, 'no readable row contains another user''s phone or email');

select is((select count(*)::int from requests where '11111111-0000-4000-8000-000000000001'::uuid not in (brand_id, creator_id)), 0,
  'requests: only my own are visible');
select is((select count(*)::int from deals where '11111111-0000-4000-8000-000000000001'::uuid not in (brand_id, creator_id)), 0,
  'deals: only my own are visible');
select is((select count(*)::int from messages m join deals d on d.id = m.deal_id
            where '11111111-0000-4000-8000-000000000001'::uuid not in (d.brand_id, d.creator_id)), 0,
  'messages: only my deals are visible');
select is((select count(*)::int from notifications where user_id <> '11111111-0000-4000-8000-000000000001'::uuid), 0,
  'notifications: only my own are visible');

-- Profile fields: ig_handle is not editable after signup
select throws_ok($$update creator_profiles set ig_handle = 'newhandle' where user_id = auth.uid()$$,
  '42501', null, 'ig_handle cannot be changed after signup');
select throws_ok($$update users set suspended = false where id = auth.uid()$$,
  '42501', null, 'users cannot unsuspend themselves');
select throws_ok($$update deals set status = 'completed' where creator_id = auth.uid()$$,
  '42501', null, 'deals cannot be updated directly');
select throws_ok($$insert into messages (deal_id, sender_id, body) values ((select aanya_deal from fx), auth.uid(), 'hi')$$,
  '42501', null, 'messages cannot be inserted directly');

-- =====================================================================
-- 2. Chat blocks contact info server-side, counts violations, suspends at 3
-- =====================================================================
select is((send_message((select aanya_deal from fx), 'Sounds great, see you in the chat!') ->> 'ok')::boolean, true,
  'clean message is accepted');
select is((send_message((select aanya_deal from fx), 'call me on +91 98765 43210') ->> 'error'), 'contact_info',
  'phone number with +91 and spaces is rejected');
select is((send_message((select aanya_deal from fx), 'my number 98765-43210') ->> 'error'), 'contact_info',
  'phone number with dashes is rejected');
select is((send_message((select aanya_deal from fx), 'mail me at aanya@gmail.com') ->> 'suspended')::boolean, true,
  'email is rejected, and the 3rd violation suspends the account');
select is((select count(*)::int from messages where body ~ '98765|gmail'), 0, 'no blocked message was stored');
select is((send_message((select aanya_deal from fx), 'hello again') ->> 'error'), 'suspended',
  'a suspended user cannot send messages');
select throws_ok($$select apply_to_campaign('c0000000-0000-4000-8000-000000000005', 6000)$$,
  'P0001', null, 'a suspended user cannot apply to campaigns');

select pg_temp.act_as('22222222-0000-4000-8000-000000000011');
select is((send_message((select aanya_deal from fx), 'ping me on wa.me/919876543210') ->> 'error'), 'contact_info',
  'wa.me link is rejected');
select is((send_message((select aanya_deal from fx), 'lets move to WhatsApp') ->> 'error'), 'contact_info',
  '"whatsapp" is rejected');
select is((send_message((select aanya_deal from fx), 'Budget is ₹4,500 and deadline 12-10-2026') ->> 'ok')::boolean, true,
  'prices and dates are not mistaken for phone numbers');
select pg_temp.act_as('11111111-0000-4000-8000-000000000003');
select is((send_message((select priya_deal from fx), 'find me on t.me/priyaglows') ->> 'error'), 'contact_info',
  't.me link is rejected');

-- =====================================================================
-- 3. Invalid status transitions are rejected server-side
-- =====================================================================
select pg_temp.act_as('22222222-0000-4000-8000-000000000011');
select throws_ok(format('select update_deal_status(%L, %L)', (select priya_deal from fx), 'completed'),
  'P0001', 'That status change isn''t allowed.', 'brand cannot complete a paid deal before payment is confirmed');
select throws_ok(format('select update_deal_status(%L, %L, %L)', (select aanya_deal from fx), 'posted', 'https://instagram.com/p/x'),
  'P0001', null, 'brand cannot mark a deal as posted (and Aanya''s deal is with a suspended creator anyway)');

select pg_temp.act_as('11111111-0000-4000-8000-000000000003');
select throws_ok(format('select update_deal_status(%L, %L)', (select priya_deal from fx), 'completed'),
  'P0001', 'That status change isn''t allowed.', 'creator cannot complete a deal');
select throws_ok(format('select update_deal_status(%L, %L)', (select priya_deal from fx), 'disputed'),
  'P0001', null, 'creator cannot report non-payment before the 7-day payment window ends');
select lives_ok(format('select update_deal_status(%L, %L)', (select priya_deal from fx), 'payment_received'),
  'creator can confirm payment on a posted paid deal');
select throws_ok(format('select submit_review(%L, 5)', (select priya_deal from fx)),
  'P0001', 'You can rate once the deal is completed.', 'no rating before completion');
select pg_temp.act_as('22222222-0000-4000-8000-000000000011');
select lives_ok(format('select update_deal_status(%L, %L)', (select priya_deal from fx), 'completed'),
  'brand can complete after payment is received');

select pg_temp.act_as_admin();
select throws_ok(format('update deals set status = %L where id = %L', 'in_progress', (select priya_deal from fx)),
  'P0001', null, 'even direct DB updates cannot move a deal backwards');

-- =====================================================================
-- 4. Auto-complete, overdue payments and non-payment reports
-- =====================================================================
select pg_temp.act_as_admin();
update deals set status = 'posted', post_url = 'https://instagram.com/p/x', posted_at = now() - interval '8 days'
 where id = (select aanya_deal from fx);
select lives_ok('select public.auto_complete_deals()', 'auto_complete_deals runs');
select is((select status::text from deals where id = (select aanya_deal from fx)), 'posted',
  'an unpaid paid deal is NOT auto-completed');
select is((select status::text from deals where id = (select barter_deal from fx)), 'completed',
  'a barter deal posted 8 days ago auto-completes');
update deals set status = 'payment_received', payment_received_at = now() where id = (select aanya_deal from fx);
select lives_ok('select public.auto_complete_deals()', 'auto_complete_deals runs again');
select is((select status::text from deals where id = (select aanya_deal from fx)), 'completed',
  'a paid deal auto-completes once the creator confirmed payment');

select ok(public.flag_overdue_payments() >= 1, 'flag_overdue_payments flags unpaid deals past the 7-day window');
select isnt((select payment_overdue_at from deals where id = (select overdue_deal from fx)), null,
  'the overdue deal is marked overdue');
select is((select count(*)::int from notifications where deal_id = (select overdue_deal from fx) and type = 'payment_overdue'), 2,
  'both the brand and the creator are told the payment is overdue');

select pg_temp.act_as('11111111-0000-4000-8000-000000000004');  -- Kabir, the creator on the overdue deal
select lives_ok(format('select update_deal_status(%L, %L, null, %L)', (select overdue_deal from fx), 'disputed', 'No payment received'),
  'creator can report non-payment once the payment is overdue');
select pg_temp.act_as_admin();
select is((select dispute_type || '/' || (disputed_by = '11111111-0000-4000-8000-000000000004')::text from deals where id = (select overdue_deal from fx)),
  'payment/true', 'the report is recorded as a payment dispute raised by the creator');
select ok(public.brand_open_payment_reports('22222222-0000-4000-8000-000000000011') >= 1,
  'the brand now shows an open non-payment report');
select is((select count(*)::int from cron.job where jobname in ('align-auto-complete-deals', 'align-flag-overdue-payments')), 2,
  'auto-complete and overdue checks are scheduled in pg_cron');

-- =====================================================================
-- 5. Signup validation: under-18 and out-of-range creators are blocked
-- =====================================================================
insert into auth.users (instance_id, id, aud, role, phone)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', '919100000099');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select throws_ok($$select complete_creator_onboarding('Teen', null, 17, 'teen.handle', 5000, 'Fashion', 'Mumbai', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}')$$,
  'P0001', null, 'under-18 creator is blocked');
select throws_ok($$select complete_creator_onboarding('Big', null, 25, 'big.handle', 12001, 'Fashion', 'Mumbai', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}')$$,
  'P0001', null, 'creator above 12K followers is blocked');
select throws_ok($$select complete_creator_onboarding('Small', null, 25, 'small.handle', 900, 'Fashion', 'Mumbai', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}')$$,
  'P0001', null, 'creator below 1K followers is blocked');
select throws_ok($$select complete_creator_onboarding('Oth', null, 25, 'oth.handle', 5000, 'Fashion', 'Mumbai', '{Reel,Other}', null, '{"Reel":"₹2K–3K","Other":"₹1K–2K"}', null, '{a,b,c}')$$,
  'P0001', null, '"Other" content type needs a description');
select throws_ok($$select complete_creator_onboarding('Rate', null, 25, 'rate.handle', 5000, 'Fashion', 'Mumbai', '{Reel,Story}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}')$$,
  'P0001', null, 'every content type needs a rate');
select lives_ok($$select complete_creator_onboarding('Micro', null, 25, 'micro.handle', 12000, 'Fashion', 'Mumbai', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}')$$,
  'creator with exactly 12K followers can sign up');
select throws_ok($$update creator_profiles set rates = '{"Reel":"₹2K–3K","Post":"₹1K–2K"}' where user_id = auth.uid()$$,
  '23514', null, 'rates must match the content types the creator makes');
select lives_ok($$update creator_profiles set content_types = '{Reel,Other}', other_content = 'Podcast clips',
                  rates = '{"Reel":"₹2K–3K","Other":"₹1K–2K"}' where user_id = auth.uid()$$,
  'creator can add "Other" with a description and a rate for it');

select pg_temp.act_as('22222222-0000-4000-8000-000000000011');
select throws_ok($$insert into campaigns (brand_id, title, content_type, comp_type, budget_bucket, deadline, niche, slots)
                   values (auth.uid(), 'Mystery content', 'Other', 'paid', '₹2K–3K', current_date + 7, 'Beauty', 1)$$,
  '23514', null, 'an "Other" campaign needs a description');
select lives_ok($$insert into campaigns (brand_id, title, content_type, content_other, comp_type, budget_bucket, deadline, niche, slots)
                  values (auth.uid(), 'Podcast feature', 'Other', 'Podcast clip', 'paid', '₹2K–3K', current_date + 7, 'Beauty', 1)$$,
  'an "Other" campaign with a description is accepted');

-- Google sign-ups have no phone from login, so profile setup must collect one.
select pg_temp.act_as_admin();
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
        'google.user@example.com', '{"full_name": "Google User"}');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000002');
select throws_ok($$select complete_brand_onboarding('Google User', null, true, 'G Brand', 'Beauty', 'g.brand.test', 100, 'Mumbai', 18, 30, null, true)$$,
  'P0001', 'Please add your mobile number. It stays private.', 'a Google sign-up without a mobile number cannot finish setup');
select throws_ok($$select complete_brand_onboarding('Google User', null, true, 'G Brand', 'Beauty', 'g.brand.test', 100, 'Mumbai', 18, 30, null, true, '12345 67890')$$,
  'P0001', 'Please enter a valid 10-digit Indian mobile number.', 'an invalid mobile number is rejected');
select lives_ok($$select complete_brand_onboarding('Google User', null, true, 'G Brand', 'Beauty', 'g.brand.test', 100, 'Mumbai', 18, 30, null, true, '+91 98765-43210')$$,
  'a Google sign-up with a valid mobile number can finish setup');
select is((select phone from user_private where user_id = auth.uid()), '919876543210', 'the mobile number is stored privately in a standard format');

-- Niches: up to 3, main niche first, "Other" needs a description.
select pg_temp.act_as_admin();
insert into auth.users (instance_id, id, aud, role, phone)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000005', 'authenticated', 'authenticated', '919100000098');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000005');
select throws_ok($$select complete_creator_onboarding('N', null, 25, 'niche.test', 5000, 'Fashion', 'Pune', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}', null,
                   array['Fashion','Beauty','Travel','Food'], null)$$,
  'P0001', 'Please pick up to 3 niches.', 'a creator cannot pick more than 3 niches');
select throws_ok($$select complete_creator_onboarding('N', null, 25, 'niche.test', 5000, 'Fashion', 'Pune', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}', null,
                   array['Fashion','Other'], null)$$,
  'P0001', null, '"Other" niche needs a description');
select lives_ok($$select complete_creator_onboarding('N', null, 25, 'niche.test', 5000, 'Fashion', 'Pune', '{Reel}', null, '{"Reel":"₹2K–3K"}', null, '{a,b,c}', null,
                   array['Fashion','Other'], 'Sustainable living')$$,
  'a creator can pick several niches including "Other" with a description');
select is((select niche || '|' || array_to_string(niches, ',') || '|' || niche_other from creator_profiles where user_id = auth.uid()),
  'Fashion|Fashion,Other|Sustainable living', 'main niche, full list and the "Other" text are saved');
select is((select count(*)::int from creator_cards where user_id = auth.uid() and niches @> array['Other']), 1,
  'the niche filter finds a creator by any of their niches, not just the main one');

-- =====================================================================
-- 6. Brand Terms: brands must accept the terms and agree to pay on every commitment
-- =====================================================================
select pg_temp.act_as_admin();
update brand_profiles set terms_version = null, terms_accepted_at = null
 where user_id in ('22222222-0000-4000-8000-000000000014', '22222222-0000-4000-8000-000000000015');

select pg_temp.act_as('22222222-0000-4000-8000-000000000014');  -- FitFuel
select throws_ok($$select send_brand_request('11111111-0000-4000-8000-000000000002', '2 Reels', 'Reel', 'paid', 4000, current_date + 10, null, null, true)$$,
  'P0001', 'Please accept the Align Brand Terms first.', 'a brand that has not accepted the terms cannot send requests');
select lives_ok($$select accept_brand_terms(brand_terms_version())$$, 'brand can accept the current Brand Terms');
select throws_ok($$select send_brand_request('11111111-0000-4000-8000-000000000002', '2 Reels', 'Reel', 'paid', 4000, current_date + 10, null, null, false)$$,
  'P0001', null, 'a request without agreeing to pay is rejected');
-- (two statements: a query can't see rows created by a function it calls)
select set_config('test.req', send_brand_request('11111111-0000-4000-8000-000000000002', '2 Reels', 'Reel', 'paid', 4000, current_date + 10, null, null, true)::text, true);
select isnt((select brand_agreed_at from requests where id = current_setting('test.req')::uuid),
  null, 'agreeing to pay records the time on the request');

select pg_temp.act_as('22222222-0000-4000-8000-000000000015');  -- Nomad Bags; Meera applied to its campaign
select lives_ok($$select accept_brand_terms(brand_terms_version())$$, 'second brand accepts the terms');
select throws_ok(format('select respond_request(%L, %L)',
                   (select id from requests where deliverable = 'Test fixture application'), 'accept'),
  'P0001', null, 'accepting an application without agreeing to pay is rejected');
select set_config('test.deal', respond_request(
         (select id from requests where deliverable = 'Test fixture application'),
         'accept', null, true)::text, true);
select isnt((select brand_agreed_at from deal_cards where id = current_setting('test.deal')::uuid),
  null, 'accepting with agreement creates a deal that records the brand''s promise to pay');

-- =====================================================================
-- 7. Admin: only admins can use admin functions; admins can resolve disputes
-- =====================================================================
select pg_temp.act_as('11111111-0000-4000-8000-000000000002');  -- Rohan, a normal creator
select throws_ok('select admin_overview()', '42501', null, 'a normal user cannot open the admin overview');
select throws_ok($$select admin_set_suspended('11111111-0000-4000-8000-000000000003', true)$$, '42501', null,
  'a normal user cannot suspend accounts');
select throws_ok('update users set is_admin = true where id = auth.uid()', '42501', null, 'a user cannot make themselves admin');

select pg_temp.act_as_admin();
select set_config('test.admin', (select id::text from users where is_admin limit 1), true);
select pg_temp.act_as(current_setting('test.admin')::uuid);
select lives_ok('select admin_overview()', 'an admin can open the overview');
select lives_ok(format('select admin_resolve_dispute(%L, %L, %L)', (select overdue_deal from fx), 'completed', 'Brand shared a payment receipt.'),
  'an admin can resolve a non-payment report');
select pg_temp.act_as_admin();
select is((select status::text || '/' || (resolution_note is not null)::text from deals where id = (select overdue_deal from fx)),
  'completed/true', 'the resolved deal is completed with the admin''s note saved');
select is((select count(*)::int from notifications where deal_id = (select overdue_deal from fx) and type = 'dispute_resolved'), 2,
  'both sides are told how the dispute was resolved');

-- Admin email allowlist: listed emails become admins on first sign-in; others don't.
select pg_temp.act_as_admin();
insert into admin_emails (email) values ('new.admin.test@example.com');
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'New.Admin.Test@example.com'),
       ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'just.a.user@example.com');
select is((select is_admin from users where id = 'aaaaaaaa-0000-4000-8000-000000000003'), true,
  'an email on the admin list becomes admin on first sign-in (case-insensitive)');
select is((select is_admin from users where id = 'aaaaaaaa-0000-4000-8000-000000000004'), false,
  'any other email does not become admin');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000004');
select throws_ok('select * from admin_emails', '42501', null, 'users cannot read the admin list');

select * from finish();
rollback;
