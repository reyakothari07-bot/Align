"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { Input } from "@/components/form";
import { errorMessage, inr } from "@/lib/format";
import { AgreeToPay } from "@/components/agree-to-pay";
import { paymentPromise } from "@/lib/legal";
import type { CompType } from "@/lib/constants";

export function RequestActions({
  requestId,
  canCounter,
  acceptLabel,
  currentAmount,
  brandPromise,
}: {
  requestId: string;
  canCounter: boolean;
  acceptLabel: string;
  currentAmount: number | null;
  /** Set when the viewer is the brand: accepting or countering commits them to pay. */
  brandPromise?: { creator: string; comp: CompType; acceptAmount: number | null };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "counter">("idle");
  const [counter, setCounter] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const needsAgree = Boolean(brandPromise);

  async function act(action: "accept" | "decline" | "counter") {
    if (action === "decline" && !confirm("Decline this request?")) return;
    if (action === "counter" && !Number(counter)) return setError("Enter your counter price.");
    if (action !== "decline" && needsAgree && !agree) return setError("Please confirm you agree to pay as per the Brand Terms.");
    setLoading(action);
    setError(null);
    const { data: dealId, error } = await createClient().rpc("respond_request", {
      p_request_id: requestId,
      p_action: action,
      p_counter_amount: action === "counter" ? Number(counter) : (null as unknown as number),
      p_agree_to_pay: action !== "decline" && needsAgree ? agree : undefined,
    });
    setLoading(null);
    if (error) return setError(errorMessage(error));
    if (action === "accept" && dealId) return router.push(`/deals/${dealId}`);
    setMode("idle");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {brandPromise && (
        <AgreeToPay
          checked={agree}
          onChange={setAgree}
          text={paymentPromise({
            creator: brandPromise.creator,
            amount: mode === "counter" ? (Number(counter) ? inr(Number(counter)) : "your counter price") : inr(brandPromise.acceptAmount),
            barter: brandPromise.comp === "barter",
            both: brandPromise.comp === "both",
          })}
        />
      )}
      {mode === "counter" ? (
        <>
          <p className="text-sm text-muted">You can counter once, on price only. After that they can only accept or decline.</p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              autoFocus
              placeholder={currentAmount ? `Offer was ₹${currentAmount}` : "Your price (₹)"}
              value={counter}
              onChange={(e) => setCounter(e.target.value.replace(/\D/g, ""))}
            />
            <Button size="md" className="h-12 shrink-0" loading={loading === "counter"} onClick={() => act("counter")}>
              Send
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setMode("idle")}>
            Cancel
          </Button>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button size="md" className="col-span-2 sm:flex-1" loading={loading === "accept"} onClick={() => act("accept")}>
            {acceptLabel}
          </Button>
          {canCounter && (
            <Button size="md" variant="secondary" onClick={() => setMode("counter")}>
              Counter
            </Button>
          )}
          <Button size="md" variant="danger" className={canCounter ? "" : "col-span-2"} loading={loading === "decline"} onClick={() => act("decline")}>
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
