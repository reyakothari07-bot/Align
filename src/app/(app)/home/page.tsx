import { Suspense } from "react";
import { requireViewer } from "@/lib/session";
import { Alert, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { CampaignCard, CreatorCard } from "@/components/cards";
import { FilterSheet } from "@/components/filter-sheet";
import { FOLLOWER_RANGES, type BudgetBucket, type ContentType } from "@/lib/constants";
import { plural, todayISO } from "@/lib/format";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { supabase, id, role, name } = await requireViewer();
  const sp = await searchParams;
  const f = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const first = name.split(" ")[0];

  if (role === "brand") {
    let q = supabase.from("creator_cards").select("*");
    if (f("location")) q = q.eq("city", f("location")!);
    if (f("category")) q = q.eq("niche", f("category")!);
    // Budget matches the creator's rate for the chosen content type, or any of their rates.
    if (f("type")) q = q.contains("content_types", [f("type") as ContentType]);
    if (f("type") && f("budget")) q = q.eq(`rates->>${f("type")}`, f("budget")!);
    else if (f("budget")) q = q.contains("rate_buckets", [f("budget")!]);
    const range = FOLLOWER_RANGES.find((r) => r.value === f("followers"));
    if (range) q = q.gte("followers", range.min).lte("followers", range.max);
    const { data: creators } = await q.order("avg_stars", { ascending: false }).order("created_at", { ascending: false }).limit(60);

    return (
      <>
        <PageHeader
          title={`Hi ${first} 👋`}
          subtitle="Creators who could be your perfect match."
          action={
            <ButtonLink href="/campaigns/new" size="md" className="hidden sm:inline-flex">
              Post a campaign
            </ButtonLink>
          }
        />
        {sp.posted === "1" && (
          <div className="mb-4">
            <Alert tone="green">Your campaign is live! Meanwhile, browse creators and send a request.</Alert>
          </div>
        )}
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">{plural(creators?.length ?? 0, "creator")}</p>
          <Suspense>
            <FilterSheet role={role} />
          </Suspense>
        </div>
        {creators?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard key={c.user_id} c={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="No creators match these filters" body="Try removing a filter or two." />
        )}
      </>
    );
  }

  let q = supabase.from("campaign_cards").select("*").eq("status", "open").gte("deadline", todayISO());
  if (f("location")) q = q.in("location", [f("location")!, "Pan-India"]);
  if (f("category")) q = q.eq("industry", f("category")!);
  if (f("type")) q = q.eq("content_type", f("type") as ContentType);
  if (f("budget")) q = q.eq("budget_bucket", f("budget") as BudgetBucket);
  const [{ data: campaigns }, { data: mine }] = await Promise.all([
    q.order("created_at", { ascending: false }).limit(60),
    supabase.from("requests").select("campaign_id").eq("creator_id", id).not("campaign_id", "is", null).neq("status", "declined"),
  ]);
  const applied = new Set(mine?.map((r) => r.campaign_id));

  return (
    <>
      <PageHeader title={`Hi ${first} 👋`} subtitle="Open campaigns from brands looking for creators like you." />
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{plural(campaigns?.length ?? 0, "open campaign")}</p>
        <Suspense>
          <FilterSheet role={role} />
        </Suspense>
      </div>
      {campaigns?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} c={c} applied={applied.has(c.id)} />
          ))}
        </div>
      ) : (
        <EmptyState title="No campaigns match right now" body="Try removing a filter, or check back soon. New campaigns are posted every day." />
      )}
    </>
  );
}
