import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { CampaignStatusToggle } from "./status-toggle";
import { deadlineLabel } from "@/components/cards";
import { contentLabel } from "@/lib/constants";

export default async function MyCampaignsPage({ searchParams }: PageProps<"/campaigns/mine">) {
  const { supabase, id } = await requireRole("brand");
  const posted = (await searchParams).posted === "1";
  const [{ data: campaigns }, { data: pending }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("brand_id", id).order("created_at", { ascending: false }),
    supabase.from("requests").select("campaign_id").eq("brand_id", id).not("campaign_id", "is", null).eq("status", "requested"),
  ]);
  const pendingBy = new Map<string, number>();
  pending?.forEach((r) => pendingBy.set(r.campaign_id!, (pendingBy.get(r.campaign_id!) ?? 0) + 1));

  return (
    <>
      <PageHeader title="My campaigns" action={<ButtonLink href="/campaigns/new" size="md">New</ButtonLink>} />
      {posted && (
        <div className="mb-4">
          <Alert tone="green">Your campaign is live. Creators can now apply.</Alert>
        </div>
      )}
      {campaigns?.length ? (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/campaigns/${c.id}`} className="min-w-0">
                  <h3 className="font-bold leading-snug hover:text-brand-700">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {contentLabel(c.content_type, c.content_other)} · {c.budget_bucket} · {deadlineLabel(c.deadline)}
                  </p>
                </Link>
                <Badge tone={c.status === "open" ? "green" : "gray"}>{c.status === "open" ? "Open" : "Closed"}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
                <span className="font-semibold">
                  {c.slots_filled}/{c.slots} booked
                </span>
                {pendingBy.get(c.id) ? (
                  <Link href="/requests?tab=received" className="font-semibold text-brand-700">
                    {pendingBy.get(c.id)} new application{pendingBy.get(c.id) === 1 ? "" : "s"} →
                  </Link>
                ) : (
                  <span className="text-muted">No pending applications</span>
                )}
                <div className="ml-auto">
                  <CampaignStatusToggle id={c.id} status={c.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No campaigns yet"
          body="Post a campaign and creators will apply with their quotes."
          action={<ButtonLink href="/campaigns/new">Post a campaign</ButtonLink>}
        />
      )}
    </>
  );
}
