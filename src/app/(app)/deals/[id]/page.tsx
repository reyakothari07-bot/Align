import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { Alert, Badge, Card, Detail, PageHeader, Stars } from "@/components/ui";
import { compLabel } from "@/components/cards";
import { DealActions } from "./deal-actions";
import { DealChat } from "./deal-chat";
import { ReviewForm } from "./review-form";
import { DEAL_STATUS_LABEL, STATUS_TONE, contentLabel, type DealStatus } from "@/lib/constants";
import { formatDate, inr } from "@/lib/format";
import { PAYMENT_DAYS } from "@/lib/legal";

export default async function DealPage({ params }: PageProps<"/deals/[id]">) {
  const { id } = await params;
  const { supabase, id: me, role, suspended } = await requireViewer();
  const { data: d } = await supabase.from("deal_cards").select("*").eq("id", id).maybeSingle();
  if (!d) notFound();

  const [{ data: messages }, { data: reviews }] = await Promise.all([
    supabase.from("messages").select("*").eq("deal_id", id).order("created_at").limit(500),
    supabase.from("reviews").select("*").eq("deal_id", id),
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("deal_id", id).eq("user_id", me).is("read_at", null),
  ]);

  const barter = d.comp_type === "barter";
  const isBrand = role === "brand";
  const otherName = isBrand ? d.creator_name! : d.brand_name!;
  const myReview = reviews?.find((r) => r.reviewer_id === me);
  const theirReview = reviews?.find((r) => r.reviewer_id !== me);
  // Paid deals only auto-complete once the creator confirms payment (barter: once posted).
  const sevenDaysAfterPost = d.posted_at ? new Date(new Date(d.posted_at).getTime() + 7 * 86400000) : null;
  const autoCompletes = (d.status === "posted" && barter) || d.status === "payment_received";
  const paymentDue = d.status === "posted" && !barter ? sevenDaysAfterPost : null;
  // Server component, rendered fresh per request, so reading the clock here is intended.
  // eslint-disable-next-line react-hooks/purity
  const overdue = Boolean(paymentDue && (d.payment_overdue_at || paymentDue.getTime() <= Date.now()));

  const steps: DealStatus[] = barter ? ["in_progress", "posted", "completed"] : ["in_progress", "posted", "payment_received", "completed"];
  const currentIdx = d.status === "disputed" ? steps.indexOf("posted") : steps.indexOf(d.status!);

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <PageHeader title="Deal Card" back="/deals" action={<Badge tone={STATUS_TONE[d.status!]}>{DEAL_STATUS_LABEL[d.status!]}</Badge>} />

        <Card className="p-5">
          <h2 className="text-lg font-bold leading-snug">{d.deliverable}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Detail label="Brand">
              <Link href={`/brands/${d.brand_id}`} className="hover:text-brand-700">{d.brand_name}</Link>
            </Detail>
            <Detail label="Creator">
              <Link href={`/creators/${d.creator_id}`} className="hover:text-brand-700">{d.creator_name}</Link>
            </Detail>
            <Detail label="Agreed price">{inr(d.amount)}{d.comp_type === "both" && " + product"}</Detail>
            <Detail label="Deadline">{formatDate(d.deadline!)}</Detail>
            <Detail label="Content">{contentLabel(d.content_type, d.content_other)}</Detail>
            <Detail label="Type">{compLabel(d.comp_type)}</Detail>
          </dl>
          {d.note && <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm">&ldquo;{d.note}&rdquo;</p>}
          {d.brand_agreed_at && (
            <p className="mt-4 flex gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-100">
              <span aria-hidden>✅</span>
              <span>
                {d.brand_name} agreed on {formatDate(d.brand_agreed_at)} to{" "}
                {barter
                  ? "send the product in time for the deadline"
                  : `pay ${inr(d.amount)}${d.comp_type === "both" ? " and send the product" : ""} within ${PAYMENT_DAYS} days of the content going live`}
                , as per the{" "}
                <a href="/terms/brands" target="_blank" className="font-semibold underline">
                  Align Brand Terms
                </a>
                .
              </span>
            </p>
          )}
          {d.post_url && (
            <a href={d.post_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
              View the post
              <span aria-hidden>↗</span>
            </a>
          )}
        </Card>

        {/* Status stepper */}
        <Card className="p-5">
          <ol className="flex items-start">
            {steps.map((s, i) => {
              const done = i < currentIdx || d.status === "completed";
              const current = i === currentIdx && d.status !== "completed";
              return (
                <li key={s} className="relative flex flex-1 flex-col items-center text-center">
                  {i > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${i <= currentIdx ? "bg-brand-600" : "bg-line"}`} />}
                  <span
                    className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-brand-600 text-white" : current ? "bg-white text-brand-700 ring-2 ring-brand-600" : "bg-white text-muted ring-1 ring-line"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`mt-2 text-[11px] font-semibold leading-tight ${current || done ? "text-ink" : "text-muted"}`}>{DEAL_STATUS_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 border-t border-line pt-5">
            {d.status === "disputed" ? (
              <Alert tone="red">
                {d.dispute_type === "payment"
                  ? isBrand
                    ? `${d.creator_name} reported that you haven't paid ${inr(d.amount)}. The Align team will review it. Please pay as soon as possible.`
                    : `You reported that ${d.brand_name} hasn't paid. The Align team will review it and get in touch.`
                  : isBrand
                    ? "You raised a dispute. The Align team will review it and get in touch."
                    : `${d.brand_name} raised a dispute. The Align team will review it and get in touch.`}
                {d.dispute_reason && <span className="mt-1 block opacity-80">Details: {d.dispute_reason}</span>}
              </Alert>
            ) : d.status === "completed" ? (
              <div className="space-y-4">
                <Alert tone="green">Deal completed{d.auto_completed ? " automatically 7 days after posting" : ""}. 🎉</Alert>
                {myReview ? (
                  <div className="text-sm">
                    <p className="font-semibold">Your rating for {otherName}</p>
                    <Stars value={myReview.stars} />
                    {myReview.text && <p className="mt-1 text-muted">{myReview.text}</p>}
                  </div>
                ) : (
                  <ReviewForm dealId={d.id!} otherName={otherName} />
                )}
                {theirReview && (
                  <div className="text-sm">
                    <p className="font-semibold">{otherName} rated you</p>
                    <Stars value={theirReview.stars} />
                    {theirReview.text && <p className="mt-1 text-muted">{theirReview.text}</p>}
                  </div>
                )}
              </div>
            ) : suspended ? (
              <p className="text-sm text-muted">Your account is suspended, so you can&apos;t update this deal.</p>
            ) : (
              <DealActions
                dealId={d.id!}
                status={d.status!}
                role={role}
                barter={barter}
                otherName={otherName}
                autoCompleteOn={autoCompletes && sevenDaysAfterPost ? formatDate(sevenDaysAfterPost) : null}
                paymentDueOn={paymentDue ? formatDate(paymentDue) : null}
                overdue={overdue}
                amountLabel={inr(d.amount)}
              />
            )}
          </div>
        </Card>
      </div>

      <DealChat dealId={d.id!} me={me} otherName={otherName} initial={messages ?? []} disabled={suspended} />
    </div>
  );
}
