"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { AgreeToPay } from "@/components/agree-to-pay";
import { Chips, Field, Input } from "@/components/form";
import { COMP_TYPES, CONTENT_TYPES, contentLabel, type CompType, type ContentType, type Rates } from "@/lib/constants";
import { OtherContentInput } from "@/components/rates";
import { paymentPromise } from "@/lib/legal";
import { inr } from "@/lib/format";
import { errorMessage, todayISO } from "@/lib/format";

export function RequestForm({
  creatorId,
  creatorName,
  defaultType,
  rates,
  creatorOther,
}: {
  creatorId: string;
  creatorName: string;
  defaultType: ContentType | null;
  rates: Rates;
  creatorOther: string | null;
}) {
  const router = useRouter();
  const [deliverable, setDeliverable] = useState("");
  const [contentType, setContentType] = useState<ContentType | null>(defaultType);
  const [contentOther, setContentOther] = useState(creatorOther ?? "");
  const [comp, setComp] = useState<CompType | null>(null);
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (deliverable.trim().length < 2) return setError("What should the creator make?");
    if (!contentType) return setError("Pick a content type.");
    if (contentType === "Other" && !contentOther.trim()) return setError("Tell the creator what kind of content you need.");
    if (!comp) return setError("Choose paid, barter or both.");
    if (comp !== "barter" && !Number(amount)) return setError("Enter your budget.");
    if (!deadline) return setError("Pick a deadline.");
    if (!agree) return setError("Please confirm you agree to pay as per the Brand Terms.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().rpc("send_brand_request", {
      p_creator_id: creatorId,
      p_deliverable: deliverable.trim(),
      p_content_type: contentType,
      p_comp_type: comp,
      p_amount: comp === "barter" ? (null as unknown as number) : Number(amount),
      p_deadline: deadline,
      p_note: note.trim(),
      p_content_other: contentType === "Other" ? contentOther.trim() : undefined,
      p_agree_to_pay: agree,
    });
    if (error) {
      setLoading(false);
      return setError(errorMessage(error));
    }
    router.push("/requests?tab=sent&sent=1");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Field label="Deliverable">
        <Input value={deliverable} maxLength={120} onChange={(e) => setDeliverable(e.target.value)} placeholder="e.g. 1 Reel + 2 Stories" />
      </Field>
      <Field
        label="Content type"
        hint={
          contentType &&
          (rates[contentType]
            ? `${creatorName}'s rate for ${contentLabel(contentType, contentType === "Other" ? creatorOther : null)}: ${rates[contentType]}`
            : `${creatorName} hasn't listed a rate for this. You can still ask.`)
        }
      >
        <Chips options={CONTENT_TYPES} value={contentType} onChange={(v) => setContentType(v as ContentType)} />
      </Field>
      {contentType === "Other" && <OtherContentInput value={contentOther} onChange={setContentOther} />}
      <Field label="Compensation">
        <Chips options={COMP_TYPES} value={comp} onChange={(v) => setComp(v as CompType)} />
      </Field>
      {comp && comp !== "barter" && (
        <Field label="Budget (₹)">
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 5000" />
        </Field>
      )}
      <Field label="Deadline">
        <Input type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Field label="One-line note (optional)" hint={`${note.length}/140 · no phone numbers or emails`}>
        <Input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should know" />
      </Field>
      {comp && (
        <AgreeToPay
          checked={agree}
          onChange={setAgree}
          text={paymentPromise({ creator: creatorName, amount: amount ? inr(Number(amount)) : "the agreed amount", barter: comp === "barter", both: comp === "both" })}
        />
      )}
      <Button loading={loading}>Send request</Button>
    </form>
  );
}
