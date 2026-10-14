# Decisions

These are choices made where the handoff spec was silent or ambiguous. In each case the simplest option won.

## Data model additions
- **`creator_profiles.content_types` and `rates`.** The brand-side filters include content type and budget, but creators had neither field. Creators pick the content they make and set **a rate for each type** (e.g. Reel ₹3K–4K, Story ₹1K–2K), since prices differ by format. This replaced a single "usual rate" at the client's request on 2026-10-09; existing creators had their old rate copied onto each type.
- **"Other" needs a description.** Picking "Other" as a content type (creator profile, campaign, or request) asks for a short description, up to 40 characters, e.g. "Podcast clip". It is shown wherever the content type appears, and contact details are blocked in it. Client request, 2026-10-09.
- **`creator_profiles.bio` and `brand_profiles.about`.** Optional, up to 160 characters, and checked for contact info. Without them, profile pages had no description at all.
- **`campaigns.brief` and `campaigns.slots_filled`.** The brief is an optional description. `slots_filled` counts accepted creators: when it reaches `slots` the campaign closes itself, and accepting beyond the limit is rejected.
- **`deals` carries `brand_id`, `creator_id`, `comp_type` and `amount`.** This keeps RLS simple and fixes the agreed price, which is the counter amount when a counter was accepted. In-app payments will attach here later.
- **`deals.payment_received_at`, `disputed_at`, `dispute_reason` and `auto_completed`.** Audit trail for admins.
- **`notifications` table.** Powers the in-site bell and drives email.
- **Foreign keys point at the profile tables** (e.g. `campaigns.brand_id → brand_profiles`), not just `users`. A campaign can only exist for a set-up brand.

## Auth and onboarding
- **Role is chosen after sign-in**, as in the spec. Users without a role are always sent to `/onboarding`. The role can't be changed later.
- **Brands have no age field in the data model**, so brand signup requires an "I confirm I am 18 or older" checkbox, which the server also checks. Creators pick their age from a 13–65 dropdown, so anyone under 18 sees the polite block instead of finding no option.
- **Email is collected during profile setup** for phone sign-ups, because notification emails need it. It's optional, and prefilled for Google sign-ups.
- **Phone numbers default to India (+91).**

## Niches
- **Creators pick up to 3 niches** (changed on 2026-10-14; previously one). The first one is stored as their main `niche`, and all of them are in `niches`.
- **The brand-side niche filter matches any of a creator's niches.**
- **"Other" needs a short description** wherever it appears: creator niches, brand industry and campaign niche. The description is up to 40 characters, with contact details blocked, the same as for content types.

## Feed and filters
- **One category list** (Fashion, Beauty, Food, …) serves creator niches, brand industry and campaign niche.
- **Creator-side "Industry" filter** matches the campaign brand's industry, as the spec says.
- **Creator-side "Location" filter** also shows Pan-India brands, since they work with creators anywhere.
- **Brand-side budget filter** matches the creator's rate for the chosen content type. With no content type picked, it matches any of their rates.
- **Follower range filter** uses buckets: 1K–2.5K, 2.5K–5K, 5K–7.5K, 7.5K–10K, 10K–12K.
- **Creator follower limit is 1K–12K**, not the 1K–10K in the original spec. Changed at the client's request on 2026-10-09.
- **Feeds hide closed and past-deadline campaigns, and suspended creators.**

## Requests and deals
- **Brand → creator requests are direct.** They aren't linked to a campaign, matching the spec form: deliverable, paid/barter, budget, deadline, note.
- **A creator applying to a barter campaign gives no quote.** "Paid + product" (`both`) campaigns require a quote.
- **Barter requests can't be countered**, because the counter is on price only. The receiver can accept or decline.
- **"Paid + product" deals follow the paid lifecycle**, including the Payment received step.
- **For paid deals, the brand can't complete from Posted.** The creator first confirms payment, as in the lifecycle table. If nobody acts, the 7-day auto-complete still applies.
- **Disputes are terminal for users.** Only an admin, via SQL with no user session, can move a deal out of `disputed`.
- **Suspended users** can still read their deals and chat history but can't take any action. A banner explains why.

## Brand Terms
- **Brands promise to pay twice over.** They accept the Brand Terms once (at signup, or on their next visit if they joined earlier or the terms change), and they tick "I agree to pay ₹X within 7 days of the content going live" every time they commit to a price (send, counter or accept). The server enforces both, and records `brand_agreed_at` and `brand_terms_version` on the request. The Deal Card shows the promise to both sides.
- **The terms text is a plain-English draft** in `src/lib/legal.ts`, with `[bracketed]` placeholders for the company name, support email and city. It needs a lawyer's review before launch. Changing it means bumping the version in both `legal.ts` and the database.
- **Payment window is 7 days after the content is marked Posted.** That matches the dispute window.
- **Unpaid paid deals never auto-complete.** Only barter deals and deals where the creator confirmed payment close after 7 days, so a creator can't lose a deal record while still unpaid. (Changed 2026-10-14; before that, every posted deal auto-completed.)
- **Creators can report non-payment, but only after the 7-day window.** Reporting earlier is refused with the due date. A report is a dispute with `dispute_type = 'payment'` raised by the creator; brand disputes are `'content'`.
- **Open non-payment reports are public as a count only.** Creators see a warning on the brand's profile, campaign page and campaign cards. Deal details stay private to the two parties.
- **Brand Terms v2026-10-14** adds the non-payment report wording, so all brands re-accept once.

## Admin panel
- **Added on the client's request (2026-10-14).** Admins are normal accounts with `users.is_admin = true`. That flag can only be set in the database, and every admin function checks it server-side, so a normal user calling one gets "Not authorised".
- **Admins can see phone numbers and emails**, because the Align team has to contact both sides when resolving disputes. This is the one exception to "contact details are never shared", and it applies to the Align team only.
- **Dispute outcomes:**
  - Non-payment: "brand has paid, complete the deal" or "give the brand a new 7-day window".
  - Content: "post is fine, brand must pay", "creator must revise and repost", or "settled, complete the deal".
  - A note is required, and both sides are notified with it.
- **Lifting a suspension resets the violation count**, so the user starts fresh at 0 of 3.

## Chat filter
- **Phone pattern:** 10 or more digits, allowing spaces, dots, dashes, brackets and a `+91` prefix. Prices like "₹4,500" and dates like "12-10-2026" pass.
- **Blocked messages are never stored.** The function returns an error instead of raising one, so the violation count still saves.
- **The same check covers other free text:** request notes, bios, campaign title and brief, and reviews. These are rejected but don't count as violations; only chat counts, per the spec.
- **Chat notifications are throttled** to one unread notification per deal, so the bell and inbox aren't flooded.

## Notifications
- **In-site bell** uses Supabase Realtime on `notifications`, and refreshes the page data when something new arrives.
- **Email** goes through a database trigger, then `pg_net`, then an Edge Function, then Resend. It's off until two Vault secrets are set (see README), and an email failure never blocks the in-site notification.
- **Opening a Deal Card** marks that deal's notifications as read. **Opening the notifications page** marks everything as read.
- **The 2-day reminder** goes to both sides of in-progress deals at 09:00 IST.

## UI
- **Light theme only.** The client asked for purple, clean and minimal.
- **Mobile:** bottom tab bar and full-width big buttons, with one main action per screen. **Desktop:** top navigation, and the Deal Card sits side by side with the chat.
- **Portfolio items** can be uploaded photos or videos (Supabase Storage bucket `portfolio`, public read, each user writes only to their own folder) or pasted post links.

## Infrastructure
- **No local Supabase or Docker.** Development runs against the hosted project to save disk space. DB tests run through a small Node runner (`npm run test:db`) instead of `supabase test db`.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** It refreshes the session and redirects signed-out users.
