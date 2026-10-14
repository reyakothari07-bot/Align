"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { Chips, Field, Input, Select, Textarea } from "@/components/form";
import { BUDGET_BUCKETS, COMP_TYPES, CONTENT_TYPES, NICHES, type BudgetBucket, type CompType, type ContentType } from "@/lib/constants";
import { errorMessage, todayISO } from "@/lib/format";
import { OtherContentInput, OtherNicheInput } from "@/components/rates";

export function CampaignForm({ brandId, first }: { brandId: string; first: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [contentOther, setContentOther] = useState("");
  const [comp, setComp] = useState<CompType | null>(null);
  const [budget, setBudget] = useState<BudgetBucket | "">("");
  const [deadline, setDeadline] = useState("");
  const [niche, setNiche] = useState<string | null>(null);
  const [nicheOther, setNicheOther] = useState("");
  const [slots, setSlots] = useState(1);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return setError("Give your campaign a short title.");
    if (!contentType) return setError("Pick a content type.");
    if (contentType === "Other" && !contentOther.trim()) return setError("Tell creators what kind of content you need.");
    if (!comp) return setError("Choose paid, barter or both.");
    if (comp !== "barter" && !budget) return setError("Pick a budget range.");
    if (!deadline) return setError("Pick a deadline.");
    if (!niche) return setError("Pick the niche you want.");
    if (niche === "Other" && !nicheOther.trim()) return setError('Tell creators the niche in the "Other" box.');
    setSaving(true);
    setError(null);
    const { error } = await createClient()
      .from("campaigns")
      .insert({
        brand_id: brandId,
        title: title.trim(),
        brief: brief.trim() || null,
        content_type: contentType,
        content_other: contentType === "Other" ? contentOther.trim() : null,
        comp_type: comp,
        budget_bucket: comp === "barter" ? "Barter" : (budget as BudgetBucket),
        deadline,
        niche,
        niche_other: niche === "Other" ? nicheOther.trim() : null,
        slots,
      });
    if (error) {
      setSaving(false);
      return setError(
        error.message.includes("check constraint") ? "Please keep phone numbers, emails and links out of the title, brief and content description." : errorMessage(error),
      );
    }
    router.push(first ? "/home?posted=1" : "/campaigns/mine?posted=1");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Field label="Campaign title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Monsoon skincare routine Reel" />
      </Field>
      <Field label="Content type">
        <Chips options={CONTENT_TYPES} value={contentType} onChange={(v) => setContentType(v as ContentType)} />
      </Field>
      {contentType === "Other" && <OtherContentInput value={contentOther} onChange={setContentOther} />}
      <Field label="Compensation">
        <Chips options={COMP_TYPES} value={comp} onChange={(v) => setComp(v as CompType)} />
      </Field>
      {comp && comp !== "barter" && (
        <Field label="Budget per creator">
          <Select value={budget} onChange={(e) => setBudget(e.target.value as BudgetBucket)} options={BUDGET_BUCKETS.filter((b) => b !== "Barter")} placeholder="Select a range" />
        </Field>
      )}
      <Field label="Deadline">
        <Input type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Field label="Niche you want">
        <Chips options={NICHES} value={niche} onChange={(v) => setNiche(v as string)} />
      </Field>
      {niche === "Other" && <OtherNicheInput value={nicheOther} onChange={setNicheOther} label="Which niche?" />}
      <Field label="Number of creators">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" size="md" className="size-12 !px-0 text-xl" onClick={() => setSlots((s) => Math.max(1, s - 1))} aria-label="Fewer">
            −
          </Button>
          <span className="w-12 text-center text-2xl font-bold">{slots}</span>
          <Button type="button" variant="secondary" size="md" className="size-12 !px-0 text-xl" onClick={() => setSlots((s) => Math.min(50, s + 1))} aria-label="More">
            +
          </Button>
        </div>
      </Field>
      <Field label="Brief (optional)" hint={`${brief.length}/500 · what should creators make?`}>
        <Textarea rows={4} maxLength={500} value={brief} onChange={(e) => setBrief(e.target.value)} />
      </Field>
      <Button loading={saving}>Post campaign</Button>
      {first && (
        <ButtonLink href="/home" variant="ghost" size="md" className="w-full">
          Skip for now
        </ButtonLink>
      )}
    </form>
  );
}
