import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { Avatar, ButtonLink, Card, Detail, PageHeader, Stars } from "@/components/ui";
import { PortfolioGrid } from "@/components/portfolio";
import { ReviewList } from "@/components/reviews";
import { RatesTable } from "@/components/rates-table";
import { compactFollowers } from "@/lib/format";

export default async function CreatorProfilePage({ params }: PageProps<"/creators/[id]">) {
  const { id } = await params;
  const { supabase, role, id: me, suspended } = await requireViewer();
  const { data: c } = await supabase.from("creator_cards").select("*").eq("user_id", id).maybeSingle();
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 md:pb-0">
      <PageHeader title="" back="/home" />
      <div className="-mt-12 flex flex-col items-center text-center">
        <Avatar name={c.name!} size="lg" />
        <h1 className="mt-3 text-2xl font-bold">{c.name}</h1>
        <p className="text-muted">@{c.ig_handle}</p>
        <div className="mt-2">
          <Stars value={Number(c.avg_stars)} count={c.review_count ?? 0} size="md" />
        </div>
        {c.bio && <p className="mt-3 max-w-md text-[15px]">{c.bio}</p>}
      </div>

      <Card className="p-5">
        <dl className="grid grid-cols-3 gap-4">
          <Detail label="Followers">{compactFollowers(c.followers!)}</Detail>
          <Detail label="Niche">{c.niche}</Detail>
          <Detail label="City">{c.city}</Detail>
        </dl>
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Rates</p>
          <RatesTable rates={c.rates} other={c.other_content} />
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold">Portfolio</h2>
        <PortfolioGrid items={c.portfolio ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Reviews</h2>
        <ReviewList supabase={supabase} userId={id} />
      </section>

      {role === "brand" && !suspended && id !== me && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-white/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto max-w-2xl">
            <ButtonLink href={`/creators/${id}/request`}>Collaborate</ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
