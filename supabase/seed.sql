-- =====================================================================
-- Align demo seed: 10 creators, 5 brands, 8 campaigns, deals in every status.
--
-- Every seeded user signs in with phone OTP locally:
--   creators  +91 90000 00001 … 00010
--   brands    +91 90000 00011 … 00015
--   code      123456   (see [auth.sms.test_otp] in config.toml)
--
-- Requests are inserted as 'requested' and then moved through the same
-- triggers the app uses, so deals, slot counts and notifications are real.
-- =====================================================================

create or replace function pg_temp.seed_user(p_id uuid, p_phone text, p_email text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, phone, phone_confirmed_at, email,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_phone, now(), null,
    '{"provider":"phone","providers":["phone"]}', '{}', now() - interval '30 days', now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'phone',
          jsonb_build_object('sub', p_id::text, 'phone', p_phone, 'phone_verified', true),
          now(), now(), now());
  -- auth trigger created public.users + user_private; add the contact email.
  update public.user_private set email = p_email where user_id = p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Creators
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select * from (values
    (1,  'Aanya Sharma', 24, 'aanya.styles',      8400, 'Fashion',      'Mumbai',    array['Reel','Post']::public.content_type[],  '{"Reel": "₹4K–5K", "Post": "₹3K–4K"}'::jsonb, null,  'Everyday outfits under ₹2K and the occasional splurge. Mumbai local trains are my runway.'),
    (2,  'Rohan Mehta',  27, 'rohan.eats',        5600, 'Food',         'Pune',      array['Reel','Story']::public.content_type[], '{"Reel": "₹2K–3K", "Story": "₹1K–2K"}'::jsonb, null,  'Finding Pune''s best misal, one plate at a time.'),
    (3,  'Priya Nair',   22, 'priyaglows',        9200, 'Beauty',       'Bengaluru', array['Reel','UGC']::public.content_type[],   '{"Reel": "₹5K–6K", "UGC": "₹4K–5K"}'::jsonb, null,  'Skincare for humid weather and honest product reviews.'),
    (4,  'Kabir Singh',  29, 'kabir.lifts',       3100, 'Fitness',      'Delhi NCR', array['Reel','Story']::public.content_type[], '{"Reel": "₹1K–2K", "Story": "₹1K–2K"}'::jsonb, null,  'Home workouts, desi meal prep and zero fads.'),
    (5,  'Meera Iyer',   26, 'meera.wanders',     7700, 'Travel',       'Chennai',   array['Post','Reel']::public.content_type[],  '{"Post": "₹5K–6K", "Reel": "₹6K–7K"}'::jsonb, null,  'Slow travel across South India. Temples, trains and filter coffee.'),
    (6,  'Arjun Rao',    25, 'arjun.techtalks',   4300, 'Tech',         'Hyderabad', array['UGC','Reel']::public.content_type[],   '{"UGC": "₹3K–4K", "Reel": "₹3K–4K"}'::jsonb, null,  'Gadget reviews in plain English, no jargon.'),
    (7,  'Sana Khan',    23, 'sana.homestories',  2500, 'Home & Decor', 'Mumbai',    array['Post','Story']::public.content_type[], '{"Post": "Barter", "Story": "Barter"}'::jsonb, null,  'Small flat, big ideas. Rental-friendly decor.'),
    (8,  'Dev Patel',    30, 'devcooksdesi',      6200, 'Food',         'Ahmedabad', array['Reel','UGC']::public.content_type[],   '{"Reel": "₹3K–4K", "UGC": "₹2K–3K"}'::jsonb, null,  'Gujarati home cooking with a twist.'),
    (9,  'Ishita Bose',  21, 'ishita.thrifts',    1800, 'Fashion',      'Kolkata',   array['Story','Post']::public.content_type[], '{"Story": "Barter", "Post": "Barter"}'::jsonb, null,  'Thrift hauls and sustainable style on a student budget.'),
    (10, 'Neel Kapoor',  28, 'neel.plays',        9900, 'Gaming',       'Bengaluru', array['Reel','Other']::public.content_type[], '{"Reel": "₹8K–9K", "Other": "₹5K–6K"}'::jsonb, 'Gaming streams',  'Mobile gaming clips, tips and the occasional rage quit.')
  ) as t(n, name, age, handle, followers, niche, city, types, rates, other, bio)
  loop
    perform pg_temp.seed_user(
      ('11111111-0000-4000-8000-0000000000' || lpad(r.n::text, 2, '0'))::uuid,
      '9190000000' || lpad(r.n::text, 2, '0'),
      r.handle || '@example.com');
    update public.users set role = 'creator', name = r.name
     where id = ('11111111-0000-4000-8000-0000000000' || lpad(r.n::text, 2, '0'))::uuid;
    insert into public.creator_profiles
      (user_id, age, ig_handle, followers, niche, niches, city, content_types, rates, other_content, bio, portfolio)
    values (
      ('11111111-0000-4000-8000-0000000000' || lpad(r.n::text, 2, '0'))::uuid,
      r.age, r.handle, r.followers, r.niche,
      case r.handle
        when 'aanya.styles' then array['Fashion', 'Lifestyle']
        when 'priyaglows' then array['Beauty', 'Lifestyle']
        when 'rohan.eats' then array['Food', 'Travel']
        when 'meera.wanders' then array['Travel', 'Lifestyle']
        else array[r.niche] end,
      r.city, r.types, r.rates, r.other, r.bio,
      array[
        'https://picsum.photos/seed/' || r.handle || '-1/600/750.jpg',
        'https://picsum.photos/seed/' || r.handle || '-2/600/750.jpg',
        'https://picsum.photos/seed/' || r.handle || '-3/600/750.jpg',
        'https://picsum.photos/seed/' || r.handle || '-4/600/750.jpg'
      ]);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select * from (values
    (11, 'Ritu Malhotra', 'Bloom Naturals', 'Beauty',  'bloomnaturals.in', 24000, 'Mumbai',    18, 34, 'Clean, Ayurveda-inspired skincare made in small batches.'),
    (12, 'Varun Gupta',   'Chai Theory',    'Food',    'chaitheory',       12000, 'Pune',      18, 40, 'Small-batch chai blends from Assam and Darjeeling estates.'),
    (13, 'Nisha Verma',   'Urban Thread',   'Fashion', 'urbanthread.co',   45000, 'Delhi NCR', 18, 30, 'Contemporary Indian wear for everyday and festive.'),
    (14, 'Aditya Joshi',  'FitFuel',        'Fitness', 'fitfuel.india',     8000, 'Bengaluru', 20, 40, 'Clean protein snacks with no added sugar.'),
    (15, 'Tara D''Souza', 'Nomad Bags',     'Travel',  'nomadbags',        15500, 'Pan-India', 20, 35, 'Carry-on friendly bags designed for Indian travel.')
  ) as t(n, name, brand_name, industry, handle, followers, location, amin, amax, about)
  loop
    perform pg_temp.seed_user(
      ('22222222-0000-4000-8000-0000000000' || lpad(r.n::text, 2, '0'))::uuid,
      '9190000000' || lpad(r.n::text, 2, '0'),
      r.handle || '@example.com');
    update public.users set role = 'brand', name = r.name
     where id = ('22222222-0000-4000-8000-0000000000' || lpad(r.n::text, 2, '0'))::uuid;
    insert into public.brand_profiles
      (user_id, brand_name, industry, ig_handle, followers, location, audience_age_min, audience_age_max, about)
    values (
      ('22222222-0000-4000-8000-0000000000' || lpad(r.n::text, 2, '0'))::uuid,
      r.brand_name, r.industry, r.handle, r.followers, r.location, r.amin, r.amax, r.about);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Campaigns, requests, deals, reviews
-- ---------------------------------------------------------------------
do $$
declare
  -- creators
  aanya  uuid := '11111111-0000-4000-8000-000000000001';
  rohan  uuid := '11111111-0000-4000-8000-000000000002';
  priya  uuid := '11111111-0000-4000-8000-000000000003';
  kabir  uuid := '11111111-0000-4000-8000-000000000004';
  meera  uuid := '11111111-0000-4000-8000-000000000005';
  arjun  uuid := '11111111-0000-4000-8000-000000000006';
  sana   uuid := '11111111-0000-4000-8000-000000000007';
  dev    uuid := '11111111-0000-4000-8000-000000000008';
  ishita uuid := '11111111-0000-4000-8000-000000000009';
  -- brands
  bloom  uuid := '22222222-0000-4000-8000-000000000011';
  chai   uuid := '22222222-0000-4000-8000-000000000012';
  urban  uuid := '22222222-0000-4000-8000-000000000013';
  fit    uuid := '22222222-0000-4000-8000-000000000014';
  nomad  uuid := '22222222-0000-4000-8000-000000000015';
  -- campaigns
  c1 uuid := 'c0000000-0000-4000-8000-000000000001';
  c2 uuid := 'c0000000-0000-4000-8000-000000000002';
  c3 uuid := 'c0000000-0000-4000-8000-000000000003';
  c4 uuid := 'c0000000-0000-4000-8000-000000000004';
  c5 uuid := 'c0000000-0000-4000-8000-000000000005';
  c6 uuid := 'c0000000-0000-4000-8000-000000000006';
  c7 uuid := 'c0000000-0000-4000-8000-000000000007';
  c8 uuid := 'c0000000-0000-4000-8000-000000000008';
  rid uuid;
  did uuid;
begin
  insert into public.campaigns (id, brand_id, title, brief, content_type, comp_type, budget_bucket, deadline, niche, slots) values
    (c1, bloom, 'Monsoon skincare routine Reel', 'Show your 3-step monsoon routine featuring our Kumkumadi face oil. Natural light, no heavy filters.', 'Reel', 'paid', '₹4K–5K', current_date + 21, 'Beauty', 3),
    (c2, bloom, 'Honest UGC review: Vitamin C serum', 'A 30–45s honest review we can use in ads. We ship the serum; you keep it.', 'UGC', 'both', '₹2K–3K', current_date + 14, 'Beauty', 5),
    (c3, chai,  'Try our new masala chai blend', 'Brew our new blend your way and tell your followers what you think. Product sent free.', 'Reel', 'barter', 'Barter', current_date + 10, 'Food', 4),
    (c4, urban, 'Festive lookbook carousel', 'Style 3 looks from our festive collection into a 5-slide carousel.', 'Post', 'paid', '₹5K–6K', current_date + 25, 'Fashion', 2),
    (c5, urban, 'Get ready with me: Diwali edit', 'A GRWM Reel for a Diwali party using one Urban Thread outfit.', 'Reel', 'paid', '₹6K–7K', current_date + 30, 'Fashion', 3),
    (c6, fit,   '30-day protein challenge Stories', 'Document a week of our 30-day challenge in daily Stories.', 'Story', 'both', '₹3K–4K', current_date + 18, 'Fitness', 3),
    (c7, nomad, 'Pack with me for a weekend trip', 'Show how much fits in our 35L carry-on for a 3-day trip.', 'Reel', 'paid', '₹7K–8K', current_date + 20, 'Travel', 2),
    (c8, nomad, 'Unboxing our new travel backpack', 'Unbox and first impressions of the Nomad Daypack.', 'UGC', 'barter', 'Barter', current_date + 12, 'Travel', 1);

  -- ---- in_progress: Aanya applied to Bloom C1 with a quote; brand accepted
  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (c1, bloom, aanya, aanya, 'Monsoon skincare routine Reel', 'Reel', 'paid', 4500, current_date + 21, 'I''ve used your face oil for a year, would love to do this!')
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;

  -- ---- posted: Bloom sent Priya a direct request; she accepted and posted
  insert into public.requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (bloom, priya, bloom, '1 Reel + 2 Stories for our serum launch', 'Reel', 'paid', 6000, current_date + 5, 'Launch is on the 15th, hoping to go live then.')
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/reel/seedPriya01/', posted_at = now() - interval '2 days' where id = did;

  -- ---- payment_received: Aanya applied to Urban C4, brand countered, Aanya accepted
  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
  values (c4, urban, aanya, aanya, 'Festive lookbook carousel', 'Post', 'paid', 5500, current_date + 25)
  returning id into rid;
  update public.requests set status = 'countered', counter_amount = 5000, countered_by = urban where id = rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/p/seedAanya02/', posted_at = now() - interval '3 days' where id = did;
  update public.deals set status = 'payment_received', payment_received_at = now() - interval '1 day' where id = did;

  -- ---- completed (barter) + both reviews: Rohan applied to Chai Theory C3
  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
  values (c3, chai, rohan, rohan, 'Try our new masala chai blend', 'Reel', 'barter', null, current_date + 10)
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/reel/seedRohan01/', posted_at = now() - interval '6 days' where id = did;
  update public.deals set status = 'completed', completed_at = now() - interval '4 days' where id = did;
  insert into public.reviews (deal_id, reviewer_id, reviewee_id, stars, text) values
    (did, chai, rohan, 5, 'Super creative Reel and delivered two days early. Would work with Rohan again.'),
    (did, rohan, chai, 4, 'Lovely chai and a clear brief. Shipping took a little long.');

  -- ---- completed (paid) + both reviews: FitFuel → Kabir direct
  insert into public.requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (fit, kabir, fit, '5 Stories showing your post-workout snack', 'Story', 'paid', 2000, current_date - 3, 'Keep it real, no scripted lines needed.')
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/stories/kabir.lifts/', posted_at = now() - interval '10 days' where id = did;
  update public.deals set status = 'payment_received', payment_received_at = now() - interval '8 days' where id = did;
  update public.deals set status = 'completed', completed_at = now() - interval '7 days' where id = did;
  insert into public.reviews (deal_id, reviewer_id, reviewee_id, stars, text) values
    (did, fit, kabir, 5, 'Authentic and our sales link got great clicks.'),
    (did, kabir, fit, 5, 'Paid on time and super easy to work with.');

  -- ---- completed (barter, campaign now full and closed): Sana applied to Nomad C8
  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
  values (c8, nomad, sana, sana, 'Unboxing our new travel backpack', 'UGC', 'barter', null, current_date + 12)
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/reel/seedSana01/', posted_at = now() - interval '5 days' where id = did;
  update public.deals set status = 'completed', completed_at = now() - interval '3 days' where id = did;
  insert into public.reviews (deal_id, reviewer_id, reviewee_id, stars, text) values
    (did, nomad, sana, 4, 'Beautiful aesthetic, exactly what we wanted.');

  -- ---- disputed: Nomad → Meera direct, posted, brand disputed
  insert into public.requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (nomad, meera, nomad, 'Reel featuring the Nomad 35L on your Kerala trip', 'Reel', 'paid', 7000, current_date + 2, 'Please tag us and use #CarryLess.')
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/reel/seedMeera01/', posted_at = now() - interval '4 days' where id = did;
  update public.deals set status = 'disputed', disputed_at = now() - interval '1 day', dispute_reason = 'The bag only appears for 2 seconds and we were not tagged.' where id = did;

  -- ---- posted 8 days ago: auto-completes on the next pg_cron run (or `select public.auto_complete_deals();`)
  insert into public.requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (chai, dev, chai, 'Chai-time snack recipe Reel using our Ginger blend', 'Reel', 'paid', 3000, current_date - 9, 'Pair it with any Gujarati snack you like.')
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;
  select id into did from public.deals where request_id = rid;
  update public.deals set status = 'posted', post_url = 'https://www.instagram.com/reel/seedDev01/', posted_at = now() - interval '8 days' where id = did;

  -- ---- in_progress with a deadline in 2 days (exercises the reminder job)
  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
  values (c6, fit, kabir, kabir, '30-day protein challenge Stories', 'Story', 'both', 3200, current_date + 2)
  returning id into rid;
  update public.requests set status = 'accepted' where id = rid;

  -- ---- open requests: pending, countered, declined
  insert into public.requests (brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (bloom, ishita, bloom, '3 Stories with our lip tint', 'Story', 'barter', null, current_date + 15, 'We''ll send the full shade range.');

  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline, note)
  values (c7, nomad, meera, meera, 'Pack with me for a weekend trip', 'Reel', 'paid', 7500, current_date + 20, 'Heading to Coorg next week, perfect timing.');

  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
  values (c2, bloom, priya, priya, 'Honest UGC review: Vitamin C serum', 'UGC', 'both', 3000, current_date + 14)
  returning id into rid;
  update public.requests set status = 'countered', counter_amount = 2500, countered_by = bloom where id = rid;

  insert into public.requests (campaign_id, brand_id, creator_id, initiated_by, deliverable, content_type, comp_type, amount, deadline)
  values (c6, fit, arjun, arjun, '30-day protein challenge Stories', 'Story', 'both', 3500, current_date + 18)
  returning id into rid;
  update public.requests set status = 'declined' where id = rid;
end;
$$;

-- A little chat history on the active deals.
insert into public.messages (deal_id, sender_id, body, created_at)
select d.id, m.sender, m.body, now() - m.ago
  from public.deals d
  join public.requests r on r.id = d.request_id
  cross join lateral (values
    (d.brand_id,   'Hi! Thanks for coming on board. Sharing the brief here.', interval '2 days'),
    (d.creator_id, 'Excited to work on this! Any must-have shots?',            interval '47 hours'),
    (d.brand_id,   'Close-up of the product in natural light, and please tag us.', interval '46 hours')
  ) as m(sender, body, ago)
 where d.status in ('in_progress', 'posted', 'payment_received', 'disputed');

-- Seeded history shouldn't flood the bell: keep only the 3 newest per user unread.
update public.notifications n set read_at = now()
 where n.id not in (
   select id from (
     select id, row_number() over (partition by user_id order by created_at desc) as rn
       from public.notifications) x
    where rn <= 3);
