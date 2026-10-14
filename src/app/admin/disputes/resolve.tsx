"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, cx } from "@/components/ui";
import { Field, Textarea } from "@/components/form";
import { errorMessage } from "@/lib/format";

const OUTCOMES = {
  payment: [
    { value: "completed", label: "Brand has paid: complete the deal" },
    { value: "posted", label: "Give the brand a new 7-day window" },
  ],
  content: [
    { value: "posted", label: "Post is fine: brand must pay" },
    { value: "in_progress", label: "Creator must revise and repost" },
    { value: "completed", label: "Settled: complete the deal" },
  ],
} as const;

export function ResolveDispute({ dealId, payment }: { dealId: string; payment: boolean }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    if (!outcome) return setError("Choose an outcome.");
    if (!note.trim()) return setError("Add a short note. Both sides will see it.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().rpc("admin_resolve_dispute", { p_deal_id: dealId, p_outcome: outcome, p_note: note.trim() });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl ring-1 ring-line p-4">
      <p className="text-sm font-bold">Resolve</p>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {OUTCOMES[payment ? "payment" : "content"].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setOutcome(o.value)}
            aria-pressed={outcome === o.value}
            className={cx(
              "rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-inset transition",
              outcome === o.value ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-line hover:ring-brand-300",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Field label="Note to both sides">
        <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Brand shared a payment receipt for ₹7,500." />
      </Field>
      <Button size="md" loading={loading} onClick={resolve}>
        Resolve dispute
      </Button>
    </div>
  );
}
