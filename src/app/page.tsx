import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/logo";

export default async function Landing() {
  const { user, profile } = await getViewer();
  if (user) redirect(profile?.role ? "/home" : "/onboarding");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo light />
        <ButtonLink href="/login" variant="secondary" size="sm" className="!ring-0">
          Sign in
        </ButtonLink>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12">
        <section className="py-10 md:py-20">
          <p className="mb-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
            For creators with 1K–12K followers
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Brands and creators, perfectly aligned.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-brand-100">
            Find paid and barter collaborations, agree terms, chat and track every deal in one place. No DMs, no middlemen.
          </p>
          <div className="mt-8 max-w-xs">
            <ButtonLink href="/login" variant="secondary" className="!ring-0 text-brand-700">
              Get started
            </ButtonLink>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Build your profile", "Creators add their best work. Brands share what they're looking for."],
            ["2", "Match and agree", "Apply to campaigns or send a request. Accept, decline or counter once."],
            ["3", "Deliver and rate", "Track the deal step by step in the Deal Card, then rate each other."],
          ].map(([n, title, body]) => (
            <div key={n} className="rounded-3xl bg-white/10 p-6 ring-1 ring-inset ring-white/15">
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700">{n}</span>
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-brand-100">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-5xl gap-5 px-4 pb-8 text-sm text-brand-100">
        <a href="/privacy" className="hover:text-white">Privacy Policy</a>
        <a href="/terms/brands" className="hover:text-white">Brand Terms</a>
      </footer>
    </div>
  );
}
