"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { Chips, Field, Input, Select, Textarea } from "@/components/form";
import { PortfolioEditor, PORTFOLIO_MIN } from "@/components/portfolio-editor";
import { OtherContentInput, OtherNicheInput, RatesEditor, pickRates } from "@/components/rates";
import { MobileInput, cleanMobile } from "@/components/mobile-input";
import type { Database } from "@/lib/database.types";
import {
  BRAND_LOCATIONS,
  CITIES,
  CONTENT_TYPES,
  CREATOR_MAX_FOLLOWERS,
  CREATOR_MIN_FOLLOWERS,
  MAX_NICHES,
  NICHES,
  type ContentType,
  type Rates,
  type Role,
} from "@/lib/constants";
import { errorMessage } from "@/lib/format";

type Creator = Database["public"]["Tables"]["creator_profiles"]["Row"];
type Brand = Database["public"]["Tables"]["brand_profiles"]["Row"];
const AGE_OPTIONS = Array.from({ length: 53 }, (_, i) => String(13 + i));

export function EditProfileForm({
  userId,
  role,
  name: initialName,
  email: initialEmail,
  phone: initialPhone,
  creator,
  brand,
}: {
  userId: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  creator: Creator | null;
  brand: Brand | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [mobile, setMobile] = useState(initialPhone);
  const [followers, setFollowers] = useState(String(creator?.followers ?? brand?.followers ?? ""));
  // creator
  const [niches, setNiches] = useState<string[]>(creator?.niches?.length ? creator.niches : creator?.niche ? [creator.niche] : []);
  const [nicheOther, setNicheOther] = useState(creator?.niche_other ?? "");
  const [city, setCity] = useState(creator?.city ?? "");
  const [types, setTypes] = useState<ContentType[]>(creator?.content_types ?? []);
  const [otherContent, setOtherContent] = useState(creator?.other_content ?? "");
  const [rates, setRates] = useState<Rates>((creator?.rates as Rates) ?? {});
  const [bio, setBio] = useState(creator?.bio ?? "");
  const [portfolio, setPortfolio] = useState<string[]>(creator?.portfolio ?? []);
  // brand
  const [brandName, setBrandName] = useState(brand?.brand_name ?? "");
  const [industry, setIndustry] = useState(brand?.industry ?? null);
  const [industryOther, setIndustryOther] = useState(brand?.industry_other ?? "");
  const [location, setLocation] = useState(brand?.location ?? "");
  const [ageMin, setAgeMin] = useState(String(brand?.audience_age_min ?? 18));
  const [ageMax, setAgeMax] = useState(String(brand?.audience_age_max ?? 35));
  const [about, setAbout] = useState(brand?.about ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please add your name.");
    const cleanPhone = cleanMobile(mobile);
    if (!cleanPhone) return setError("Please enter a valid 10-digit mobile number.");
    if (role === "creator") {
      const f = Number(followers);
      if (f < CREATOR_MIN_FOLLOWERS || f > CREATOR_MAX_FOLLOWERS) return setError("Align is for creators with 1K–12K followers.");
      if (portfolio.length < PORTFOLIO_MIN) return setError("Keep at least 3 portfolio items.");
      if (!niches.length) return setError("Pick at least one niche.");
      if (niches.includes("Other") && !nicheOther.trim()) return setError('Tell us your niche in the "Other" box.');
      if (!types.length) return setError("Pick at least one type of content you make.");
      if (types.includes("Other") && !otherContent.trim()) return setError('Tell brands what kind of "Other" content you make.');
      if (types.some((t) => !rates[t])) return setError("Please choose a rate for each type of content you make.");
    } else {
      if (Number(ageMin) > Number(ageMax)) return setError("The audience 'from' age should be lower than the 'to' age.");
      if (industry === "Other" && !industryOther.trim()) return setError('Tell us your industry in the "Other" box.');
    }

    setSaving(true);
    const supabase = createClient();
    const results = await Promise.all([
      supabase.from("users").update({ name: name.trim() }).eq("id", userId),
      supabase.from("user_private").update({ email: email.trim() || null, phone: "91" + cleanPhone }).eq("user_id", userId),
      role === "creator"
        ? supabase
            .from("creator_profiles")
            .update({
              followers: Number(followers),
              niche: niches[0],
              niches,
              niche_other: niches.includes("Other") ? nicheOther.trim() : null,
              city,
              content_types: types,
              other_content: types.includes("Other") ? otherContent.trim() : null,
              rates: pickRates(rates, types),
              bio: bio.trim() || null,
              portfolio,
            })
            .eq("user_id", userId)
        : supabase
            .from("brand_profiles")
            .update({
              brand_name: brandName.trim(),
              industry: industry!,
              industry_other: industry === "Other" ? industryOther.trim() : null,
              followers: Number(followers || 0),
              location,
              audience_age_min: Number(ageMin),
              audience_age_max: Number(ageMax),
              about: about.trim() || null,
            })
            .eq("user_id", userId),
    ]);
    const failed = results.find((r) => r.error)?.error;
    setSaving(false);
    if (failed) {
      return setError(failed.message.includes("check constraint") ? "Please keep phone numbers, emails and links out of your bio, and check the values." : errorMessage(failed));
    }
    router.push("/profile?saved=1");
    router.refresh();
  }

  const handle = creator?.ig_handle ?? brand?.ig_handle;

  return (
    <form onSubmit={save} className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Field label="Instagram handle" hint="Your handle is set once at signup and can't be changed.">
        <Input value={`@${handle}`} disabled />
      </Field>
      <Field label="Your name">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <Field label="Email" hint="Private. Used for notifications only.">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <MobileInput value={mobile} onChange={setMobile} />

      {role === "creator" ? (
        <>
          <Field label="Followers">
            <Input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Your niches" hint={`Pick up to ${MAX_NICHES}. The first one is your main niche.`}>
            <Chips options={NICHES} value={niches} onChange={(v) => setNiches(v as string[])} multiple max={MAX_NICHES} />
          </Field>
          {niches.includes("Other") && <OtherNicheInput value={nicheOther} onChange={setNicheOther} />}
          <Field label="City">
            <Select value={city} onChange={(e) => setCity(e.target.value)} options={CITIES} />
          </Field>
          <Field label="Content you make">
            <Chips options={CONTENT_TYPES} value={types} onChange={(v) => setTypes(v as ContentType[])} multiple />
          </Field>
          {types.includes("Other") && <OtherContentInput value={otherContent} onChange={setOtherContent} />}
          <Field label="Your rates" hint="What you charge for one piece of each.">
            <RatesEditor types={types} other={otherContent} rates={rates} onChange={setRates} />
          </Field>
          <Field label="Bio" hint={`${bio.length}/160`}>
            <Textarea rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          <Field label="Portfolio">
            <PortfolioEditor userId={userId} value={portfolio} onChange={setPortfolio} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Brand name">
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Industry">
            <Chips options={NICHES} value={industry} onChange={(v) => setIndustry(v as string)} />
          </Field>
          {industry === "Other" && <OtherNicheInput value={industryOther} onChange={setIndustryOther} label="Your industry" />}
          <Field label="Followers">
            <Input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Location">
            <Select value={location} onChange={(e) => setLocation(e.target.value)} options={BRAND_LOCATIONS} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience age from">
              <Select value={ageMin} onChange={(e) => setAgeMin(e.target.value)} options={AGE_OPTIONS} />
            </Field>
            <Field label="to">
              <Select value={ageMax} onChange={(e) => setAgeMax(e.target.value)} options={AGE_OPTIONS} />
            </Field>
          </div>
          <Field label="About" hint={`${about.length}/160`}>
            <Textarea rows={2} maxLength={160} value={about} onChange={(e) => setAbout(e.target.value)} />
          </Field>
        </>
      )}
      <Button loading={saving}>Save changes</Button>
    </form>
  );
}
