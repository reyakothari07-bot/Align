import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { Avatar, Card, Detail, PageHeader, Stars } from "@/components/ui";
import { CampaignCard } from "@/components/cards";
import { ReviewList } from "@/components/reviews";
import { PaymentReportWarning } from "@/components/payment-warning";
import { compactFollowers, todayISO } from "@/lib/format";

export default async function BrandProfilePage({ params }: PageProps<"/brands/[id]">) {
  const { id } = await params;
  const { supabase } = await requireViewer();
  const [{ data: b }, { data: campaigns }] = await Promise.all([
    supabase.from("brand_cards").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("campaign_cards").select("*").eq("brand_id", id).eq("status", "open").gte("deadline", todayISO()).order("created_at", { ascending: false }),
  ]);
  if (!b) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="" back="/home" />
      <div className="-mt-12 flex flex-col items-center text-center">
        <Avatar name={b.brand_name!} size="lg" />
        <h1 className="mt-3 text-2xl font-bold">{b.brand_name}</h1>
        <p className="text-muted">@{b.ig_handle}</p>
        <div className="mt-2">
          <Stars value={Number(b.avg_stars)} count={b.review_count ?? 0} size="md" />
        </div>
        {b.about && <p className="mt-3 max-w-md text-[15px]">{b.about}</p>}
      </div>
      <PaymentReportWarning count={b.open_payment_reports} brand={b.brand_name!} />
      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Detail label="Industry">{b.industry}</Detail>
          <Detail label="Location">{b.location}</Detail>
          <Detail label="Followers">{compactFollowers(b.followers!)}</Detail>
          <Detail label="Audience">
            {b.audience_age_min}–{b.audience_age_max} yrs
          </Detail>
        </dl>
      </Card>
      {!!campaigns?.length && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Open campaigns</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">Reviews</h2>
        <ReviewList supabase={supabase} userId={id} />
      </section>
    </div>
  );
}
