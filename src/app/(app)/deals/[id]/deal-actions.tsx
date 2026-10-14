"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { Field, Input, Textarea } from "@/components/form";
import type { DealStatus, Role } from "@/lib/constants";
import { errorMessage } from "@/lib/format";

/** Shows only the buttons the viewer is allowed to press. The server enforces the same rules. */
export function DealActions({
  dealId,
  status,
  role,
  barter,
  otherName,
  autoCompleteOn,
  paymentDueOn,
  overdue,
  amountLabel,
}: {
  dealId: string;
  status: DealStatus;
  role: Role;
  barter: boolean;
  otherName: string;
  /** Set only where the deal really does auto-complete (barter, or payment confirmed). */
  autoCompleteOn: string | null;
  /** Paid deals at "posted": the date payment is due. */
  paymentDueOn: string | null;
  overdue: boolean;
  amountLabel: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [loading, setLoading] = useState<DealStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(next: DealStatus, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setLoading(next);
    setError(null);
    const { error } = await createClient().rpc("update_deal_status", {
      p_deal_id: dealId,
      p_status: next,
      p_post_url: next === "posted" ? url.trim() : undefined,
      p_reason: next === "disputed" ? reason.trim() : undefined,
    });
    setLoading(null);
    if (error) return setError(errorMessage(error));
    setDisputing(false);
    router.refresh();
  }

  const autoNote = autoCompleteOn && (
    <p className="text-xs text-muted">Completes automatically on {autoCompleteOn} unless a dispute is raised.</p>
  );

  const disputeBlock = (opener: string, question: string, submit: string, placeholder?: string) => (
    <>
      {disputing ? (
        <div className="space-y-3 rounded-2xl bg-red-50/60 p-4">
          <Field label={question}>
            <Textarea rows={2} maxLength={300} value={reason} placeholder={placeholder} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="danger" size="md" loading={loading === "disputed"} onClick={() => move("disputed")}>
              {submit}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setDisputing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-full text-red-600" onClick={() => setDisputing(true)}>
          {opener}
        </Button>
      )}
    </>
  );
  const brandDispute = disputeBlock("Something wrong? Raise a dispute", "What went wrong?", "Raise dispute");
  const dueNote = paymentDueOn && (
    <p className={`text-sm font-medium ${overdue ? "text-red-600" : "text-muted"}`}>
      {overdue ? `Payment was due on ${paymentDueOn} and is now overdue.` : `Payment of ${amountLabel} is due by ${paymentDueOn}.`}
    </p>
  );

  let body: React.ReactNode;
  if (role === "creator") {
    if (status === "in_progress") {
      body = (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            move("posted");
          }}
        >
          <Field label="Link to your post" hint="Paste the Instagram link once the content is live.">
            <Input type="url" inputMode="url" placeholder="https://www.instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Button loading={loading === "posted"} disabled={!url}>
            Mark as posted
          </Button>
        </form>
      );
    } else if (status === "posted" && !barter) {
      body = (
        <div className="space-y-3">
          <p className="text-sm text-muted">Once {otherName} pays you (outside Align for now), confirm it here.</p>
          {dueNote}
          <Button loading={loading === "payment_received"} onClick={() => move("payment_received", "Confirm you've received the payment?")}>
            Confirm payment received
          </Button>
          {overdue ? (
            disputeBlock(
              `Not paid? Report ${otherName}`,
              "Tell us what happened",
              "Report non-payment",
              "e.g. I posted on the 5th and haven't received anything",
            )
          ) : (
            <p className="text-xs text-muted">If you aren&apos;t paid by {paymentDueOn}, you can report it here.</p>
          )}
        </div>
      );
    } else {
      body = (
        <div className="space-y-1">
          <p className="text-sm text-muted">Waiting for {otherName} to confirm completion.</p>
          {autoNote}
        </div>
      );
    }
  } else {
    if (status === "in_progress") {
      body = <p className="text-sm text-muted">{otherName} is creating the content. You&apos;ll be notified when it&apos;s posted.</p>;
    } else if ((status === "posted" && barter) || status === "payment_received") {
      body = (
        <div className="space-y-3">
          <p className="text-sm text-muted">Happy with the post? Confirm the deal is complete.</p>
          <Button loading={loading === "completed"} onClick={() => move("completed", "Mark this deal as complete?")}>
            Confirm completion
          </Button>
          {autoNote}
          {brandDispute}
        </div>
      );
    } else if (status === "posted") {
      body = (
        <div className="space-y-3">
          <p className="text-sm text-muted">The content is live. Please pay {otherName}; they&apos;ll confirm once it arrives.</p>
          {dueNote}
          {overdue && (
            <Alert>
              You agreed to pay within 7 days of the content going live. {otherName} can now report non-payment to Align. Please pay
              as soon as possible.
            </Alert>
          )}
          {brandDispute}
        </div>
      );
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {body}
    </div>
  );
}
