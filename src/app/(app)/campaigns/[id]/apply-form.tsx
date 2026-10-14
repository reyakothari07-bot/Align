"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card } from "@/components/ui";
import { Field, Input } from "@/components/form";
import { errorMessage } from "@/lib/format";

export function ApplyForm({ campaignId, barter, budget }: { campaignId: string; barter: boolean; budget: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!barter && !Number(quote)) return setError("Please add your price quote.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().rpc("apply_to_campaign", {
      p_campaign_id: campaignId,
      p_quote: barter ? (null as unknown as number) : Number(quote),
      p_note: note.trim() || undefined,
    });
    if (error) {
      setLoading(false);
      return setError(errorMessage(error));
    }
    router.push("/requests?tab=sent&applied=1");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={apply} className="space-y-4">
        <h2 className="text-lg font-bold">Apply to this campaign</h2>
        {error && <Alert>{error}</Alert>}
        {!barter && (
          <Field label="Your price quote (₹)" hint={`The brand's budget is ${budget}.`}>
            <Input inputMode="numeric" value={quote} onChange={(e) => setQuote(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 4500" />
          </Field>
        )}
        <Field label="Note (optional)" hint={`${note.length}/140`}>
          <Input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Why you're a great fit" />
        </Field>
        <Button loading={loading}>{barter ? "Apply" : "Apply with quote"}</Button>
      </form>
    </Card>
  );
}
