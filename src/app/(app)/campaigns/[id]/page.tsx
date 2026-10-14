import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { Alert, Avatar, Badge, ButtonLink, Card, Detail, PageHeader, Stars } from "@/components/ui";
import { compLabel, deadlineLabel } from "@/components/cards";
import { CampaignStatusToggle } from "../mine/status-toggle";
import { ApplyForm } from "./apply-form";
import { PaymentReportWarning } from "@/components/payment-warning";
import { formatDate, inr, todayISO } from "@/lib/format";
import { contentLabel } from "@/lib/constants";

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  const { supabase, id: me, role, suspended } = await requireViewer();
  const { data: c } = await supabase.from("campaign_cards").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const isOwner = c.brand_id === me;
  const { data: existing } =
    role === "creator"
      ? await supabase.from("requests").select("id, status, amount, counter_amount").eq("campaign_id", id).eq("creator_id", me).neq("status", "declined").maybeSingle()
      : { data: null };
  const slotsLeft = c.slots! - c.slots_filled!;
  const open = c.status === "open" && c.deadline! >= todayISO() && slotsLeft > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={c.title!} back={isOwner ? "/campaigns/mine" : "/home"} />

      <Link href={`/brands/${c.brand_id}`}>
        <Card className="flex items-center gap-3 p-4 hover:ring-brand-200">
          <Avatar name={c.brand_name!} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{c.brand_name}</p>
            <p className="text-sm text-muted">
              {c.industry} · {c.location}
            </p>
          </div>
          <Stars value={Number(c.brand_avg_stars)} count={c.brand_review_count ?? 0} />
        </Card>
      </Link>

      {role === "creator" && <PaymentReportWarning count={c.brand_open_payment_reports} brand={c.brand_name!} />}

      <Card className="p-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={open ? "green" : "gray"}>{open ? "Open" : "Closed"}</Badge>
          <Badge>{contentLabel(c.content_type, c.content_other)}</Badge>
          <Badge tone="gray">{c.niche}</Badge>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4">
          <Detail label="Compensation">{compLabel(c.comp_type)}</Detail>
          <Detail label="Budget">{c.budget_bucket}</Detail>
          <Detail label="Deadline">{formatDate(c.deadline!)}</Detail>
          <Detail label="Slots">
            {slotsLeft} of {c.slots} left
          </Detail>
        </dl>
        {c.brief && <p className="mt-5 whitespace-pre-line border-t border-line pt-5 text-[15px] leading-relaxed">{c.brief}</p>}
      </Card>

      {role === "creator" &&
        (existing ? (
          <Alert tone="brand">
            You applied{existing.amount ? ` with a quote of ${inr(existing.amount)}` : ""}.{" "}
            <Link href={existing.status === "accepted" ? "/deals" : "/requests?tab=sent"} className="font-semibold underline">
              {existing.status === "accepted" ? "View your deal" : "Track your application"}
            </Link>
          </Alert>
        ) : suspended ? null : open ? (
          <ApplyForm campaignId={c.id!} barter={c.comp_type === "barter"} budget={c.budget_bucket!} />
        ) : (
          <Alert tone="amber">This campaign isn&apos;t accepting applications. {deadlineLabel(c.deadline!)}.</Alert>
        ))}

      {isOwner && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm font-semibold">
            {c.slots_filled}/{c.slots} creators booked
          </p>
          <div className="flex gap-2">
            <ButtonLink href="/requests?tab=received" size="sm" variant="secondary">
              Applications
            </ButtonLink>
            <CampaignStatusToggle id={c.id!} status={c.status!} />
          </div>
        </Card>
      )}
    </div>
  );
}
