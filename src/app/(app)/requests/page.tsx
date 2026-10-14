import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { Alert, Avatar, Badge, Card, EmptyState, ButtonLink, PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { compLabel } from "@/components/cards";
import { RequestActions } from "./request-actions";
import { REQUEST_STATUS_LABEL, contentLabel } from "@/lib/constants";
import { formatDate, inr, timeAgo } from "@/lib/format";

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const sp = await searchParams;
  const tab = sp.tab === "sent" ? "sent" : "received";
  const { supabase, id: me, role, suspended } = await requireViewer();

  const { data: all } = await supabase.from("request_cards").select("*").order("updated_at", { ascending: false }).limit(200);
  const received = all?.filter((r) => r.initiated_by !== me) ?? [];
  const sent = all?.filter((r) => r.initiated_by === me) ?? [];
  const list = tab === "sent" ? sent : received;
  // Needs my action: received & waiting, or sent & countered by them
  const needsMe = (r: (typeof received)[number]) =>
    (r.status === "requested" && r.initiated_by !== me) || (r.status === "countered" && r.initiated_by === me);

  return (
    <>
      <PageHeader title="My requests" />
      {sp.sent === "1" && (
        <div className="mb-4">
          <Alert tone="green">Request sent! We&apos;ll notify you when they respond.</Alert>
        </div>
      )}
      {sp.applied === "1" && (
        <div className="mb-4">
          <Alert tone="green">Application sent! We&apos;ll notify you when the brand responds.</Alert>
        </div>
      )}
      <Tabs
        base="/requests"
        active={tab}
        tabs={[
          { key: "received", label: "Received", count: received.filter(needsMe).length },
          { key: "sent", label: "Sent", count: sent.filter(needsMe).length },
        ]}
      />

      {list.length ? (
        <div className="space-y-3">
          {list.map((r) => {
            const otherId = role === "brand" ? r.creator_id! : r.brand_id!;
            const otherName = role === "brand" ? r.creator_name! : r.brand_name!;
            const otherHref = role === "brand" ? `/creators/${otherId}` : `/brands/${otherId}`;
            const iCountered = r.countered_by === me;
            const tone = r.status === "accepted" ? "green" : r.status === "declined" ? "gray" : r.status === "countered" ? "amber" : "brand";
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-center gap-3">
                  <Link href={otherHref}>
                    <Avatar name={otherName} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={otherHref} className="block truncate font-semibold hover:text-brand-700">
                      {otherName}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {r.campaign_id ? (r.initiated_by === r.creator_id ? "Applied to campaign" : "Campaign") : "Direct request"} · {timeAgo(r.created_at!)}
                    </p>
                  </div>
                  <Badge tone={tone}>{REQUEST_STATUS_LABEL[r.status!]}</Badge>
                </div>

                <h3 className="mt-4 font-bold leading-snug">
                  {r.campaign_id ? <Link href={`/campaigns/${r.campaign_id}`} className="hover:text-brand-700">{r.deliverable}</Link> : r.deliverable}
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span>{contentLabel(r.content_type, r.content_other)}</span>
                  <span>{compLabel(r.comp_type)}</span>
                  <span className={r.counter_amount ? "line-through" : "font-semibold text-ink"}>{inr(r.amount)}</span>
                  {r.counter_amount && <span className="font-semibold text-amber-700">Counter: {inr(r.counter_amount)}</span>}
                  <span>Due {formatDate(r.deadline!)}</span>
                </div>
                {r.note && <p className="mt-3 rounded-2xl bg-canvas px-4 py-3 text-sm">&ldquo;{r.note}&rdquo;</p>}

                <div className="mt-4 border-t border-line pt-4">
                  {r.status === "accepted" && r.deal_id ? (
                    <ButtonLink href={`/deals/${r.deal_id}`} size="md" className="w-full">
                      Open Deal Card
                    </ButtonLink>
                  ) : r.status === "declined" ? (
                    <p className="text-sm text-muted">This request was declined.</p>
                  ) : needsMe(r) ? (
                    suspended ? (
                      <p className="text-sm text-muted">Your account is suspended.</p>
                    ) : (
                      <RequestActions
                        requestId={r.id!}
                        canCounter={r.status === "requested" && r.comp_type !== "barter"}
                        acceptLabel={r.status === "countered" ? `Accept ${inr(r.counter_amount)}` : "Accept"}
                        currentAmount={r.amount}
                        brandPromise={
                          role === "brand"
                            ? {
                                creator: r.creator_name!.split(" ")[0],
                                comp: r.comp_type!,
                                acceptAmount: r.status === "countered" ? r.counter_amount : r.amount,
                              }
                            : undefined
                        }
                      />
                    )
                  ) : (
                    <p className="text-sm text-muted">
                      {iCountered ? `You countered with ${inr(r.counter_amount)}. ` : ""}Waiting for {otherName} to respond.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : tab === "received" ? (
        <EmptyState
          title="No requests yet"
          body={role === "brand" ? "Applications to your campaigns will show up here." : "Requests from brands will show up here. Complete deals to get noticed!"}
          action={role === "brand" ? <ButtonLink href="/campaigns/new">Post a campaign</ButtonLink> : undefined}
        />
      ) : (
        <EmptyState
          title="Nothing sent yet"
          body={role === "brand" ? "Find a creator you like and tap Collaborate." : "Apply to a campaign with your quote."}
          action={<ButtonLink href="/home">{role === "brand" ? "Browse creators" : "Browse campaigns"}</ButtonLink>}
        />
      )}
    </>
  );
}
