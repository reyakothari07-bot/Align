import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { ButtonLink } from "@/components/ui";
import { Logo, LogoMark, TAGLINE } from "@/components/logo";

// Public landing page. Everything stated here is true of the product today;
// add real numbers and testimonials once there are real users.

const ICONS = {
  tag: "M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9zm5-4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z",
  handshake: "M8 12l3 3 5-5M12 21a9 9 0 100-18 9 9 0 000 18z",
  lock: "M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zm-3 9l2 2 4-4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z",
  gift: "M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-2-4-6-4-6-1.5S10 7 12 7zm0 0c2-4 6-4 6-1.5S14 7 12 7z",
  chat: "M4 5h16v11H8l-4 4V5z",
  check: "M5 12l4 4 10-10",
  x: "M6 6l12 12M18 6L6 18",
};

function Icon({ d, className = "size-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function SectionHeading({ eyebrow, title, body, light }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={`text-xs font-bold uppercase tracking-[0.3em] ${light ? "text-brand-100" : "text-brand-600"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-extrabold tracking-tight md:text-4xl ${light ? "text-white" : "text-ink"}`}>{title}</h2>
      {body && <p className={`mt-4 text-base md:text-lg ${light ? "text-brand-100" : "text-muted"}`}>{body}</p>}
    </div>
  );
}

const FEATURES: { icon: keyof typeof ICONS; title: string; body: string }[] = [
  {
    icon: "tag",
    title: "A price for every format",
    body: "Creators set a separate rate for Reels, Stories, UGC and more. Brands see exactly what each format costs and filter by budget.",
  },
  {
    icon: "handshake",
    title: "Every deal on a Deal Card",
    body: "Agreed price, deliverable, deadline and status in one place, from “In progress” to “Posted”, “Paid” and “Completed”.",
  },
  {
    icon: "shield",
    title: "A recorded promise to pay",
    body: "Brands agree to pay within 7 days of the content going live, every time they make an offer. The promise is saved on the deal.",
  },
  {
    icon: "lock",
    title: "Your number stays private",
    body: "Phone numbers and emails are never shown. The deal chat blocks contact details, so nobody gets pulled into DMs.",
  },
  {
    icon: "star",
    title: "Ratings that mean something",
    body: "Only people who completed a deal together can rate each other, so every review comes from real work.",
  },
  {
    icon: "gift",
    title: "Paid, barter or both",
    body: "Cash, free products, or both. Brands post campaigns, creators apply with a quote, and either side can counter once.",
  },
];

const CREATOR_STEPS = [
  ["Build your profile", "Add your niches, your rate for each content type, and 3–6 of your best posts."],
  ["Find and apply", "Browse open campaigns, filter by budget and content type, and apply with your quote."],
  ["Create, post, get paid", "Agree terms, chat in the Deal Card, post, and confirm when you're paid. Then rate the brand."],
];

const BRAND_STEPS = [
  ["Tell us what you need", "Post a campaign with the content type, budget, deadline and how many creators you want."],
  ["Pick your creators", "Filter creators by niche, followers, city and rate. Send a request or accept applications."],
  ["Track every deal", "Brief creators in the deal chat, see the post go live, pay, and rate the collaboration."],
];

const COMPARISON: [string, string, string][] = [
  ["Find creators or brands that fit your niche and budget", "Endless scrolling and cold DMs", "Filters for niche, followers, rate and content type"],
  ["Agree on price", "Lost in chat threads", "Offer, one counter-offer, accept: all recorded"],
  ["Know you'll get paid", "A promise in a DM", "A recorded promise to pay, plus overdue reminders and reports"],
  ["Keep your contact details private", "Shared from the first message", "Never shown; blocked in chat"],
  ["Track the work", "Screenshots and reminders", "One Deal Card with live status"],
  ["Build a reputation", "Word of mouth", "Ratings and reviews from completed deals"],
];

const FAQ: [string, ReactNode][] = [
  [
    "Who can join Align?",
    "Creators aged 18+ with 1,000 to 12,000 Instagram followers, and brands of any size looking for authentic content from them.",
  ],
  [
    "How do payments work?",
    "For now, brands pay creators directly, outside Align. Every time a brand makes or accepts an offer, it agrees to pay within 7 days of the content going live, and that promise is saved on the Deal Card. The creator confirms in the app when the money arrives.",
  ],
  [
    "What if a brand doesn't pay?",
    "Once the 7 days have passed, both sides get a reminder, and the creator can report non-payment from the Deal Card. The Align team reviews it, and brands with open reports are flagged to other creators.",
  ],
  [
    "Will brands see my phone number or email?",
    "No. Contact details are never shown to the other side, and the deal chat blocks phone numbers, emails and WhatsApp or Telegram links.",
  ],
  ["Can I do barter collaborations?", "Yes. Campaigns and requests can be paid, barter (free products), or both."],
  ["Does it cost anything?", "Align is free to use right now."],
];

export default async function Landing() {
  const { user, profile } = await getViewer();
  if (user) redirect(profile?.role ? "/home" : "/onboarding");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      {/* ------------------------------------------------ Hero */}
      <div className="bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 text-white">
        <header className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-5">
          <nav className="hidden gap-6 text-sm font-semibold text-brand-100 md:flex">
            <a href="#about" className="hover:text-white">About</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#why" className="hover:text-white">Why Align</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <ButtonLink href="/login" variant="secondary" size="sm" className="ml-auto !ring-0">
            Sign in
          </ButtonLink>
        </header>

        <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-16 pt-8 text-center md:pb-24 md:pt-12">
          <Logo light size="lg" tagline />
          <p className="mb-4 mt-10 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
            For creators with 1K–12K followers
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Brands and creators, perfectly aligned.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-brand-100">
            Find paid and barter collaborations, agree terms, chat and track every deal in one place. No DMs, no middlemen.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <ButtonLink href="/login" variant="secondary" className="!ring-0 text-brand-700">
              Get started
            </ButtonLink>
            <ButtonLink href="#how" variant="ghost" className="!text-white ring-1 ring-inset ring-white/40 hover:!bg-white/10">
              See how it works
            </ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-brand-100">
            {["Free to join", "Paid & barter deals", "Contact details stay private"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Icon d={ICONS.check} className="size-4" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ------------------------------------------------ About */}
      <section id="about" className="scroll-mt-4 px-4 py-20 md:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">About Align</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Small creators. Real influence.</h2>
            <p className="mt-5 text-lg text-muted">
              Nano and micro creators often have the most engaged audiences, but they&apos;re easy to overlook. Brands looking for them
              end up scrolling for hours, sending cold DMs and chasing replies, while creators juggle offers, prices and payments
              across chats.
            </p>
            <p className="mt-4 text-lg text-muted">
              Align brings both sides into one place. Creators show their work and their prices; brands post what they need.
              Deals are agreed, tracked and rated inside Align, with every step on record.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              ["For creators", "Get discovered for your niche, set your own price for each format, and work with brands that promise to pay on time."],
              ["For brands", "Find creators who fit your niche, audience and budget, and manage every collaboration from brief to payment in one place."],
            ].map(([title, body], i) => (
              <div key={title} className={`rounded-3xl p-6 ${i === 0 ? "bg-brand-600 text-white" : "bg-white ring-1 ring-line"}`}>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className={`mt-2 text-[15px] ${i === 0 ? "text-brand-100" : "text-muted"}`}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ How it works */}
      <section id="how" className="scroll-mt-4 bg-white px-4 py-20 md:py-28">
        <SectionHeading eyebrow="How it works" title="From first hello to a finished deal" body="Two simple paths, one shared Deal Card." />
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          {[
            { who: "I'm a creator", steps: CREATOR_STEPS },
            { who: "I'm a brand", steps: BRAND_STEPS },
          ].map(({ who, steps }) => (
            <div key={who} className="rounded-3xl bg-canvas p-6 ring-1 ring-line md:p-8">
              <h3 className="text-xl font-bold">{who}</h3>
              <ol className="mt-6 space-y-6">
                {steps.map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ What sets Align apart */}
      <section id="apart" className="scroll-mt-4 px-4 py-20 md:py-28">
        <SectionHeading
          eyebrow="What sets Align apart"
          title="Built for fair, simple collaborations"
          body="Everything a small creator or a growing brand needs to work together with confidence."
        />
        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-white p-6 ring-1 ring-line">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon d={ICONS[f.icon]} />
              </span>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-[15px] text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ Why Align */}
      <section id="why" className="scroll-mt-4 bg-gradient-to-b from-brand-700 to-brand-600 px-4 py-20 text-white md:py-28">
        <SectionHeading light eyebrow="Why Align" title="DMs weren't built for deals" body="Here's how collaborating on Align compares with sorting it out in DMs or through middlemen." />
        <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-3xl bg-white text-ink">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr] gap-4 border-b border-line bg-canvas px-6 py-4 text-sm font-bold md:grid">
            <span className="text-muted">What you need</span>
            <span className="text-muted">Without Align</span>
            <span className="text-brand-700">With Align</span>
          </div>
          <ul className="divide-y divide-line">
            {COMPARISON.map(([need, before, after]) => (
              <li key={need} className="grid gap-2 px-6 py-5 md:grid-cols-[1.2fr_1fr_1fr] md:gap-4">
                <span className="font-semibold">{need}</span>
                <span className="flex items-start gap-2 text-sm text-muted">
                  <Icon d={ICONS.x} className="mt-0.5 size-4 shrink-0 text-red-400" />
                  {before}
                </span>
                <span className="flex items-start gap-2 text-sm font-medium">
                  <Icon d={ICONS.check} className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {after}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ FAQ */}
      <section id="faq" className="scroll-mt-4 px-4 py-20 md:py-28">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-white ring-1 ring-line open:ring-brand-200">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-5 text-[15px] text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ Final call to action */}
      <section className="px-4 pb-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-500 px-6 py-14 text-center text-white md:py-20">
          <LogoMark variant="onpurple" className="h-14 w-auto" />
          <h2 className="mt-6 max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl">Ready to find your perfect match?</h2>
          <p className="mt-3 max-w-md text-brand-100">Join in one tap with Google. It takes a couple of minutes to set up your profile.</p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <ButtonLink href="/login" variant="secondary" className="!ring-0 text-brand-700">
              I&apos;m a creator
            </ButtonLink>
            <ButtonLink href="/login" variant="ghost" className="!text-white ring-1 ring-inset ring-white/40 hover:!bg-white/10">
              I&apos;m a brand
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Footer */}
      <footer className="border-t border-line bg-white px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">{TAGLINE}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted">
            <a href="#about" className="hover:text-ink">About</a>
            <a href="#why" className="hover:text-ink">Why Align</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <a href="/privacy" className="hover:text-ink">Privacy Policy</a>
            <a href="/terms/brands" className="hover:text-ink">Brand Terms</a>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-xs text-muted">© {new Date().getFullYear()} Align</p>
      </footer>
    </div>
  );
}
