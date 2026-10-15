# Align

Align is a mobile-first website that matches Instagram creators (1K–12K followers) with brands for paid and barter collaborations. Everything from sign-up to a completed, rated deal happens on the site. Brands and creators never see each other's phone numbers or emails.

**Stack:** Next.js 16 (App Router, TypeScript) + Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions, `pg_cron`) · Resend for email · Vercel hosting.

There's no local database. Development and production both use a hosted Supabase project, and nothing needs Docker.

---

## Two Supabase projects

| Project | Used by | Data |
|---|---|---|
| **Live**: `zvvgpaivqmmlhgzfrnib` (Mumbai) | the live site on Vercel (`.env.local`, Vercel env vars) | real users only. Google sign-in; phone login is off. |
| **Demo**: `tyxlfwbiqayrrpujaknv` (Tokyo) | local development (`npm run dev` reads `.env.development.local`) | all the demo accounts. Phone test login with code `123456`. |

Demo auth settings live in `demo/supabase/config.toml` (`supabase config push --workdir demo`). To copy data between projects, see `scripts/export-data.mjs`. A full backup of the live data from before the demo accounts were moved is kept outside the repo in `../backups/`.

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com). Pick the **Mumbai (ap-south-1)** region.
2. Copy these from **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. From **Connect → Session pooler**, copy the connection string → `DATABASE_URL`. The scripts below use it; it is never sent to the browser.

```bash
cp .env.example .env.local   # then fill in the three values
npm install
```

> **If the project lives in an iCloud-synced folder** (e.g. Documents with "Optimize Mac Storage" on), macOS can evict library files to the cloud, making builds slow or failing with `ETIMEDOUT` errors. Keep the dependencies and build output local by giving them a `.nosync` name that iCloud ignores:
>
> ```bash
> mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules
> mkdir -p .next.nosync && rm -rf .next && ln -s .next.nosync .next
> ```
>
> Run the first line again after any `npm install` / `npm ci`, since npm replaces the link with a regular folder.

### 2. Create the database

This creates every table, RLS policy, function, trigger, `pg_cron` job, Realtime publication and storage bucket:

```bash
npm run db:setup
```

You can also paste `supabase/migrations/20261003000000_init.sql` into the SQL Editor, or use the CLI (`supabase link` then `supabase db push`).

**Demo data** (optional): 10 creators, 5 brands, 8 campaigns and deals in every status.

```bash
npm run db:seed
```

### 3. Auth

**Phone OTP:** Authentication → Sign In / Providers → **Phone**. Turn it on and connect an SMS provider. Twilio Verify works well for India; Indian numbers need DLT-registered templates through the provider.

To sign in as the seeded demo users without real SMS, add **test phone numbers** on the same screen. All of them use the code `123456`:

| Who | Numbers |
|---|---|
| Creators (Aanya, Rohan, Priya, …) | `919000000001` … `919000000010` |
| Brands (Bloom Naturals, Chai Theory, Urban Thread, FitFuel, Nomad Bags) | `919000000011` … `919000000015` |

On the sign-in page, enter just the 10 digits, for example `9000000001`.

**Google:** create an OAuth client in Google Cloud (type "Web application") with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Authentication → Providers → **Google**.

**URLs:** Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback`, `http://localhost:3000/auth/callback`

### 4. Email notifications (Resend)

Every in-site notification is also emailed when the user has an email on file. A database trigger calls the Edge Function, and the Edge Function sends through Resend.

1. Create a [Resend](https://resend.com) account and verify your sending domain.
2. Deploy the function and set its secrets (Supabase CLI, `supabase login` + `supabase link` first):
   ```bash
   supabase functions deploy send-notification-email --no-verify-jwt
   supabase secrets set RESEND_API_KEY=re_xxx NOTIFY_WEBHOOK_SECRET=<long-random-string> EMAIL_FROM="Align <hello@your-domain.com>" SITE_URL=https://your-domain.com
   ```
3. In the SQL Editor, tell the database where to send notifications. Use the same random string:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-notification-email', 'notify_email_url');
   select vault.create_secret('<long-random-string>', 'notify_email_secret');
   ```

Until these secrets exist, notifications still appear in the bell and emails are skipped silently.

### 5. Run it

```bash
npm run dev
```

Then open http://localhost:3000.

### 6. Deploy to Vercel

1. Push this folder to a GitHub repo and **Import** it in Vercel, using the client's account.
2. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Leave `DATABASE_URL` out of Vercel; the site doesn't need it.
3. Add the custom domain under **Settings → Domains**, then update the Supabase URL configuration from step 3.

---

## Tests

| Command | What it proves |
|---|---|
| `npm run test:db` | 81 pgTAP checks run directly in Postgres and roll back afterwards, so no data changes. Covered: contact details unreadable by others, chat filter (phone with spaces, dashes or `+91`, email, `wa.me`, `t.me`, WhatsApp, Telegram), violation counter and suspension at 3, every invalid deal transition rejected, 7-day auto-complete, under-18 and outside-1K–12K signups blocked, `ig_handle` not editable. Needs the seed. |
| `npm run test:privacy` | Signs in through the real API as a creator and as a brand, reads every table and view the site can reach, and fails if any response contains another user's phone or email. Needs the seed and the test phone numbers from step 3. |
| `npm run typecheck` / `npm run lint` / `npm run build` | Static checks. |

---

## How the rules are enforced

All rules are enforced **in the database**. The UI only decides which buttons to show.

| Rule | Where |
|---|---|
| Phone and email never visible to others | Stored only in `user_private`. Its RLS lets only the owner read it, and column grants keep it out of every other table and view. |
| Chat blocks contact info | `send_message()` rejects the message and increments `violation_count`; at 3 the user is `suspended`. A trigger on `messages` also blocks direct inserts. Request notes, bios, campaign briefs and reviews have the same check. |
| Suspension | Suspended users can view their deals but can't message, apply, send or answer requests, or move deals (`assert_active()`). |
| Deal lifecycle | `update_deal_status()` checks who is acting and whether the transition is allowed. The `deals_guard` trigger blocks any illegal transition from any path. |
| One counter-offer | `respond_request()`: only the receiver can counter, once and on price only. After a counter, only the original sender can accept or decline. |
| Deal auto-created on accept | Trigger on `requests`. It also fills campaign slots and closes the campaign when it's full. |
| 7-day auto-complete | `pg_cron` job `align-auto-complete-deals` runs daily at 00:30 UTC. It only closes **barter** deals and deals where the creator **confirmed payment**; unpaid paid deals stay open. |
| Overdue payments | `pg_cron` job `align-flag-overdue-payments` (daily, 09:15 IST) flags paid deals still unpaid 7 days after posting and notifies both sides. The creator can then **report non-payment** (a payment dispute). Open reports show as a warning on the brand's profile and campaigns (`brand_open_payment_reports()`). |
| 2-day deadline reminder | `pg_cron` job `align-deadline-reminders` runs daily at 03:30 UTC (09:00 IST). |
| 18+ and 1K–12K followers | `complete_creator_onboarding()` and `complete_brand_onboarding()` validate these, and table check constraints back them up. The UI shows a polite message first. |
| Brands must agree to pay | Brands accept the **Brand Terms** (`/terms/brands`) at signup, and again whenever the version changes (`brand_terms_version()`). Sending a request, countering or accepting is rejected by the server unless the brand ticks "I agree to pay". The time and terms version are saved on the request and shown on the Deal Card. |
| IG handle asked once | Unique, and not in the column grants for updates. |
| Ratings only after Completed | `submit_review()`, with `unique(deal_id, reviewer_id)`. |

---

## Admin panel

Admins sign in at `/login` like everyone else and land on **`/admin`**:
- **Overview:** what needs attention, plus marketplace numbers.
- **Disputes:** non-payment reports and content disputes, with both sides' contact details, the brand's recorded promise to pay, and the deal chat. Resolve with a note; both sides are notified.
- **Users:** search, warnings, suspend or lift a suspension.
- **Follower checks:** self-reported follower counts to spot-check against Instagram.

Admins are managed from the database. The easiest way is the **admin email list**: anyone signing in with a listed email becomes an admin automatically, including on their first Google sign-in.

```sql
insert into public.admin_emails (email) values ('someone@example.com');
```

To make an existing account admin directly, or to remove admin rights:

```sql
update public.users set is_admin = true  where id = (select id from auth.users where email = 'someone@example.com');
update public.users set is_admin = false where id = (select id from auth.users where email = 'someone@example.com');
```

Current admins: `reyakothari07@gmail.com`, `aaryaman1112@gmail.com` (plus the demo phone account below).

The demo admin is the test number `9100000009` (code `123456`). Remove its admin flag, or delete it, before launch.

## Admin tasks (SQL Editor)

```sql
-- Resolve a dispute (only admins can move a deal out of 'disputed')
update deals set status = 'completed', completed_at = now() where id = '<deal-id>';

-- Lift a suspension
update users set suspended = false, violation_count = 0 where id = '<user-id>';

-- Follower spot-check list (self-reported counts)
select u.name, c.ig_handle, c.followers, c.created_at from creator_profiles c join users u on u.id = c.user_id order by c.created_at desc;

-- Open disputes
select * from deal_cards where status = 'disputed';
```

**Remove test accounts** (and everything they created) by phone number. Runs against whichever database `DATABASE_URL` points to. It shows what it would delete unless you add `--yes`:

```bash
node --env-file=.env.local scripts/delete-test-users.mjs 919100000001 919100000002
```

---

## Project layout

```
src/app/                 pages (App Router)
  page.tsx               landing
  login/                 phone OTP + Google
  onboarding/            role choice + profile setup wizard
  welcome/
  (app)/                 signed-in area (shared header, bell, bottom nav)
    home/                feed + filters (campaigns for creators, creators for brands)
    campaigns/           new · mine · [id] (detail + apply)
    creators/[id]/       profile · request (brand → creator)
    brands/[id]/
    requests/            sent / received + accept · decline · counter
    deals/               list · [id] Deal Card + chat + rating · complete
    notifications/
    profile/             view · edit
src/components/          UI kit, nav, bell, filter sheet, portfolio
src/lib/                 Supabase clients, session helpers, constants, generated DB types
src/proxy.ts             session refresh + signed-out redirect (Next 16 "proxy", formerly middleware)
supabase/migrations/     the whole schema
supabase/seed.sql        demo data
supabase/tests/          pgTAP suite
supabase/functions/      send-notification-email (Resend)
scripts/                 db setup / seed / test runners
```

After any schema change, regenerate types:

```bash
supabase gen types typescript --project-id <project-ref> > src/lib/database.types.ts
```

## Planned: in-app payments

`deals.amount` holds the agreed price, and `deals.comp_type` records paid, barter or both. A future `payments` table keyed on `deal_id` can replace the manual "Payment received" step.
