"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card } from "@/components/ui";
import { Chips, Field, Input, ProgressBar, Select, Textarea } from "@/components/form";
import { PortfolioEditor, PORTFOLIO_MIN } from "@/components/portfolio-editor";
import { OtherContentInput, OtherNicheInput, RatesEditor, pickRates } from "@/components/rates";
import { MobileInput, cleanMobile } from "@/components/mobile-input";
import { Logo } from "@/components/logo";
import {
  BRAND_LOCATIONS,
  CITIES,
  CONTENT_TYPES,
  CREATOR_MAX_FOLLOWERS,
  CREATOR_MIN_FOLLOWERS,
  MIN_AGE,
  NICHES,
  MAX_NICHES,
  POLITE,
  type ContentType,
  type Rates,
  type Role,
} from "@/lib/constants";
import { errorMessage } from "@/lib/format";

const AGE_OPTIONS = Array.from({ length: 53 }, (_, i) => String(13 + i));
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const normHandle = (h: string) => h.trim().replace(/^@+/, "").toLowerCase();

export function OnboardingWizard({
  userId,
  defaultName,
  defaultEmail,
  hasPhone,
}: {
  userId: string;
  defaultName: string;
  defaultEmail: string;
  hasPhone: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState(1);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // shared
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [mobile, setMobile] = useState("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  // creator
  const [age, setAge] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [nicheOther, setNicheOther] = useState("");
  const [city, setCity] = useState("");
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [otherContent, setOtherContent] = useState("");
  const [rates, setRates] = useState<Rates>({});
  const [bio, setBio] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  // brand
  const [adult, setAdult] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [industryOther, setIndustryOther] = useState("");
  const [location, setLocation] = useState("");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("35");
  const [about, setAbout] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const total = role === "brand" ? 4 : 5;

  function next(check?: () => string | null) {
    // null = valid; "" = blocked (the polite block screen is showing), so stay on this step.
    const msg = check?.() ?? null;
    setError(msg || null);
    if (msg === null) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      role === "creator"
        ? await supabase.rpc("complete_creator_onboarding", {
            p_name: name.trim(),
            p_email: email.trim(),
            p_age: Number(age),
            p_ig_handle: normHandle(handle),
            p_followers: Number(followers),
            p_niche: niches[0],
            p_niches: niches,
            p_niche_other: niches.includes("Other") ? nicheOther.trim() : undefined,
            p_city: city,
            p_content_types: contentTypes,
            p_other_content: contentTypes.includes("Other") ? otherContent.trim() : "",
            p_rates: pickRates(rates, contentTypes),
            p_bio: bio.trim(),
            p_portfolio: portfolio,
            p_phone: hasPhone ? undefined : (cleanMobile(mobile) ?? undefined),
          })
        : await supabase.rpc("complete_brand_onboarding", {
            p_name: name.trim(),
            p_email: email.trim(),
            p_confirm_adult: adult,
            p_brand_name: brandName.trim(),
            p_industry: industry!,
            p_industry_other: industry === "Other" ? industryOther.trim() : undefined,
            p_ig_handle: normHandle(handle),
            p_followers: Number(followers || 0),
            p_location: location,
            p_audience_age_min: Number(ageMin),
            p_audience_age_max: Number(ageMax),
            p_about: about.trim(),
            p_accept_terms: acceptTerms,
            p_phone: hasPhone ? undefined : (cleanMobile(mobile) ?? undefined),
          });
    if (error) {
      setSaving(false);
      return setError(errorMessage(error));
    }
    router.replace("/welcome");
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/");
  }

  if (blocked) {
    return (
      <Shell>
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-2xl">💜</div>
          <h1 className="text-xl font-bold">Thanks for stopping by</h1>
          <p className="mt-2 text-muted">{blocked}</p>
          <div className="mt-8 space-y-2">
            <Button variant="secondary" onClick={() => setBlocked(null)}>
              Go back
            </Button>
            <Button variant="ghost" size="md" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <ProgressBar step={step} total={total} />
      <div className="mt-8 space-y-6">
        {error && <Alert>{error}</Alert>}

        {step === 1 && (
          <>
            <Heading title="How will you use Align?" sub="You can't switch later, so pick the one that fits." />
            <div className="grid gap-3">
              {(
                [
                  ["creator", "I'm a Creator", "I make content on Instagram and want to work with brands.", "🎬"],
                  ["brand", "I'm a Brand", "I want creators to make content for my business.", "🛍️"],
                ] as const
              ).map(([value, title, body, emoji]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={role === value}
                  className={`flex items-center gap-4 rounded-3xl bg-white p-5 text-left ring-2 ring-inset transition ${
                    role === value ? "ring-brand-600" : "ring-line hover:ring-brand-200"
                  }`}
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">{emoji}</span>
                  <span>
                    <span className="block text-lg font-bold">{title}</span>
                    <span className="block text-sm text-muted">{body}</span>
                  </span>
                </button>
              ))}
            </div>
            <Button disabled={!role} onClick={() => next()}>
              Continue
            </Button>
          </>
        )}

        {/* ---------------- Creator ---------------- */}
        {role === "creator" && step === 2 && (
          <>
            <Heading title="About you" sub="Only your name is shown on your profile." />
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" maxLength={60} />
            </Field>
            <Field label="Age">
              <Select value={age} onChange={(e) => setAge(e.target.value)} options={AGE_OPTIONS} placeholder="Select your age" />
            </Field>
            <Field label="Email" hint="For deal updates. Never shared with brands.">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            {!hasPhone && <MobileInput value={mobile} onChange={setMobile} hint="Private. Never shown to brands. Align may call you about a deal." />}
            <Button
              onClick={() =>
                next(() => {
                  if (!name.trim()) return "Please tell us your name.";
                  if (!age) return "Please select your age.";
                  if (Number(age) < MIN_AGE) {
                    setBlocked(POLITE.underAge);
                    return "";
                  }
                  if (email && !EMAIL_RE.test(email.trim())) return "That email doesn't look right.";
                  if (!hasPhone && !cleanMobile(mobile)) return "Please enter a valid 10-digit mobile number.";
                  return null;
                })
              }
            >
              Continue
            </Button>
          </>
        )}

        {role === "creator" && step === 3 && (
          <>
            <Heading title="Your Instagram" sub="We ask for your handle once. It can't be changed later." />
            <Field label="Instagram handle">
              <div className="flex">
                <span className="flex h-12 items-center rounded-l-2xl bg-brand-50 px-4 font-semibold text-brand-700 ring-1 ring-inset ring-line">@</span>
                <Input className="rounded-l-none" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="yourhandle" autoCapitalize="none" />
              </div>
            </Field>
            <Field label="Followers" hint="Align is for creators with 1,000 to 12,000 followers. We spot-check handles.">
              <Input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 4200" />
            </Field>
            <Button
              onClick={() =>
                next(() => {
                  if (!HANDLE_RE.test(normHandle(handle))) return "Please enter a valid Instagram handle (letters, numbers, . and _).";
                  const f = Number(followers);
                  if (!followers) return "Please enter your follower count.";
                  if (f < CREATOR_MIN_FOLLOWERS || f > CREATOR_MAX_FOLLOWERS) {
                    setBlocked(POLITE.followers);
                    return "";
                  }
                  return null;
                })
              }
            >
              Continue
            </Button>
          </>
        )}

        {role === "creator" && step === 4 && (
          <>
            <Heading title="Your content" sub="Helps brands find you." />
            <Field label="Your niches" hint={`Pick up to ${MAX_NICHES}. The first one is your main niche.`}>
              <Chips options={NICHES} value={niches} onChange={(v) => setNiches(v as string[])} multiple max={MAX_NICHES} />
            </Field>
            {niches.includes("Other") && <OtherNicheInput value={nicheOther} onChange={setNicheOther} />}
            <Field label="City">
              <Select value={city} onChange={(e) => setCity(e.target.value)} options={CITIES} placeholder="Select your city" />
            </Field>
            <Field label="Content you make">
              <Chips options={CONTENT_TYPES} value={contentTypes} onChange={(v) => setContentTypes(v as ContentType[])} multiple />
            </Field>
            {contentTypes.includes("Other") && <OtherContentInput value={otherContent} onChange={setOtherContent} />}
            <Field label="Your rates" hint="What you charge for one piece of each. Brands see these and can filter by them.">
              <RatesEditor types={contentTypes} other={otherContent} rates={rates} onChange={setRates} />
            </Field>
            <Field label="Short bio (optional)" hint={`${bio.length}/160 · no phone numbers or emails`}>
              <Textarea rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you post about?" />
            </Field>
            <Button
              onClick={() =>
                next(() => {
                  if (!niches.length) return "Please pick at least one niche.";
                  if (niches.includes("Other") && !nicheOther.trim()) return 'Tell us your niche in the "Other" box.';
                  if (!city) return "Please select your city.";
                  if (!contentTypes.length) return "Pick at least one type of content you make.";
                  if (contentTypes.includes("Other") && !otherContent.trim()) return "Tell us what kind of \"Other\" content you make.";
                  if (contentTypes.some((t) => !rates[t])) return "Please choose a rate for each type of content you make.";
                  return null;
                })
              }
            >
              Continue
            </Button>
          </>
        )}

        {role === "creator" && step === 5 && (
          <>
            <Heading title="Your best work" sub="Add 3 to 6 of your best posts. Upload them or paste links." />
            <PortfolioEditor userId={userId} value={portfolio} onChange={setPortfolio} />
            <Button loading={saving} disabled={portfolio.length < PORTFOLIO_MIN} onClick={submit}>
              Finish setup
            </Button>
          </>
        )}

        {/* ---------------- Brand ---------------- */}
        {role === "brand" && step === 2 && (
          <>
            <Heading title="About you" sub="The person managing collaborations." />
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ritu Malhotra" maxLength={60} />
            </Field>
            <Field label="Work email" hint="For deal updates. Never shared with creators.">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com" />
            </Field>
            {!hasPhone && <MobileInput value={mobile} onChange={setMobile} hint="Private. Never shown to creators. Align may call you about a deal." />}
            <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-inset ring-line">
              <input type="checkbox" className="size-5 accent-brand-600" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              <span className="text-sm font-medium">I confirm I am 18 or older</span>
            </label>
            <Button
              onClick={() =>
                next(() => {
                  if (!name.trim()) return "Please tell us your name.";
                  if (email && !EMAIL_RE.test(email.trim())) return "That email doesn't look right.";
                  if (!hasPhone && !cleanMobile(mobile)) return "Please enter a valid 10-digit mobile number.";
                  if (!adult) return "Please confirm you are 18 or older. " + POLITE.underAge.replace(/^Align is only for people aged 18 and over\. /, "");
                  return null;
                })
              }
            >
              Continue
            </Button>
          </>
        )}

        {role === "brand" && step === 3 && (
          <>
            <Heading title="Your brand" sub="We ask for your Instagram handle once. It can't be changed later." />
            <Field label="Brand name">
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Bloom Naturals" maxLength={60} />
            </Field>
            <Field label="Industry">
              <Chips options={NICHES} value={industry} onChange={(v) => setIndustry(v as string)} />
            </Field>
            {industry === "Other" && <OtherNicheInput value={industryOther} onChange={setIndustryOther} label="Your industry" />}
            <Field label="Brand Instagram handle">
              <div className="flex">
                <span className="flex h-12 items-center rounded-l-2xl bg-brand-50 px-4 font-semibold text-brand-700 ring-1 ring-inset ring-line">@</span>
                <Input className="rounded-l-none" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="yourbrand" autoCapitalize="none" />
              </div>
            </Field>
            <Field label="Followers">
              <Input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 12000" />
            </Field>
            <Field label="Location">
              <Select value={location} onChange={(e) => setLocation(e.target.value)} options={BRAND_LOCATIONS} placeholder="Where are you based?" />
            </Field>
            <Button
              onClick={() =>
                next(() => {
                  if (!brandName.trim()) return "Please add your brand name.";
                  if (!industry) return "Please pick your industry.";
                  if (industry === "Other" && !industryOther.trim()) return 'Tell us your industry in the "Other" box.';
                  if (!HANDLE_RE.test(normHandle(handle))) return "Please enter a valid Instagram handle (letters, numbers, . and _).";
                  if (!location) return "Please select your location.";
                  return null;
                })
              }
            >
              Continue
            </Button>
          </>
        )}

        {role === "brand" && step === 4 && (
          <>
            <Heading title="Your audience" sub="Who are you trying to reach?" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Audience age from">
                <Select value={ageMin} onChange={(e) => setAgeMin(e.target.value)} options={AGE_OPTIONS} />
              </Field>
              <Field label="to">
                <Select value={ageMax} onChange={(e) => setAgeMax(e.target.value)} options={AGE_OPTIONS} />
              </Field>
            </div>
            <Field label="About your brand (optional)" hint={`${about.length}/160 · no phone numbers or emails`}>
              <Textarea rows={2} maxLength={160} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="What do you make?" />
            </Field>
            <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-inset ring-line">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-brand-600"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span className="text-sm font-medium">
                I agree to the{" "}
                <a href="/terms/brands" target="_blank" className="font-semibold text-brand-700 underline">
                  Align Brand Terms
                </a>
                , including paying creators the agreed amount on time.
              </span>
            </label>
            <Button
              loading={saving}
              onClick={() => {
                if (Number(ageMin) > Number(ageMax)) return setError("The 'from' age should be lower than the 'to' age.");
                if (!acceptTerms) return setError("Please read and accept the Align Brand Terms to continue.");
                submit();
              }}
            >
              Finish setup
            </Button>
          </>
        )}

        {step > 1 && (
          <Button variant="ghost" size="md" className="w-full" onClick={() => (setError(null), setStep((s) => s - 1))}>
            Back
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}
