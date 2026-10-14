"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { Field, Input } from "@/components/form";
import { errorMessage } from "@/lib/format";

export function ReviewForm({ dealId, otherName }: { dealId: string; otherName: string }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars) return setError("Tap a star to rate.");
    setLoading(true);
    const { error } = await createClient().rpc("submit_review", { p_deal_id: dealId, p_stars: stars, p_text: text.trim() });
    if (error) {
      setLoading(false);
      return setError(errorMessage(error));
    }
    router.push(`/deals/${dealId}/complete`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="font-semibold">How was working with {otherName}?</p>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)}
            className={`text-4xl leading-none transition ${n <= stars ? "text-amber-400" : "text-gray-200 hover:text-amber-200"}`}
          >
            ★
          </button>
        ))}
      </div>
      <Field label="One-line review (optional)" hint={`${text.length}/140`}>
        <Input value={text} maxLength={140} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button loading={loading}>Submit rating</Button>
    </form>
  );
}
