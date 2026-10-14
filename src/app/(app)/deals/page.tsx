import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { deadlineLabel } from "@/components/cards";
import { DEAL_STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import { inr } from "@/lib/format";

export default async function DealsPage({ searchParams }: PageProps<"/deals">) {
  const tab = (await searchParams).tab === "completed" ? "completed" : "active";
  const { supabase, id: me, role } = await requireViewer();
  const [{ data: deals }, { data: myReviews }] = await Promise.all([
    supabase.from("deal_cards").select("*").order("updated_at", { ascending: false }),
    supabase.from("reviews").select("deal_id").eq("reviewer_id", me),
  ]);
  const reviewed = new Set(myReviews?.map((r) => r.deal_id));
  const active = deals?.filter((d) => d.status !== "completed") ?? [];
  const done = deals?.filter((d) => d.status === "completed") ?? [];
  const list = tab === "completed" ? done : active;

  return (
    <>
      <PageHeader title="My deals" />
      <Tabs
        base="/deals"
        active={tab}
        tabs={[
          { key: "active", label: "Active", count: active.length },
          { key: "completed", label: "Completed", count: done.filter((d) => !reviewed.has(d.id!)).length },
        ]}
      />
      {list.length ? (
        <div className="space-y-3">
          {list.map((d) => {
            const other = role === "brand" ? d.creator_name! : d.brand_name!;
            return (
              <Link key={d.id} href={`/deals/${d.id}`} className="block">
                <Card className="flex items-center gap-3 p-4 transition hover:ring-brand-200">
                  <Avatar name={other} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.deliverable}</p>
                    <p className="truncate text-sm text-muted">
                      {other} · {inr(d.amount)}
                      {d.status === "in_progress" && ` · ${deadlineLabel(d.deadline!)}`}
                    </p>
                  </div>
                  {d.status === "completed" && !reviewed.has(d.id!) ? (
                    <Badge tone="amber">Rate now</Badge>
                  ) : (
                    <Badge tone={STATUS_TONE[d.status!]}>{DEAL_STATUS_LABEL[d.status!]}</Badge>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      ) : tab === "active" ? (
        <EmptyState
          title="No active deals"
          body="When a request is accepted, its Deal Card appears here."
          action={<ButtonLink href="/home">{role === "brand" ? "Find creators" : "Find campaigns"}</ButtonLink>}
        />
      ) : (
        <EmptyState title="No completed deals yet" body="Finished deals and your ratings will live here." />
      )}
    </>
  );
}
