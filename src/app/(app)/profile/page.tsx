import { requireViewer } from "@/lib/session";
import { Alert, Avatar, Badge, ButtonLink, Card, Detail, PageHeader, Stars } from "@/components/ui";
import { PortfolioGrid } from "@/components/portfolio";
import { ReviewList } from "@/components/reviews";
import { SignOutButton } from "./sign-out";
import { RatesTable } from "@/components/rates-table";
import { compactFollowers } from "@/lib/format";

export default async function MyProfilePage({ searchParams }: PageProps<"/profile">) {
  const saved = (await searchParams).saved === "1";
  const { supabase, id, role, name } = await requireViewer();
  const [{ data: priv }, { data: creator }, { data: brand }] = await Promise.all([
    supabase.from("user_private").select("phone, email").eq("user_id", id).maybeSingle(),
    role === "creator" ? supabase.from("creator_cards").select("*").eq("user_id", id).maybeSingle() : Promise.resolve({ data: null }),
    role === "brand" ? supabase.from("brand_cards").select("*").eq("user_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const p = creator ?? brand;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" action={<ButtonLink href="/profile/edit" size="sm" variant="secondary">Edit</ButtonLink>} />
      {saved && <Alert tone="green">Profile saved.</Alert>}

      <div className="flex items-center gap-4">
        <Avatar name={brand?.brand_name ?? name} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">{brand?.brand_name ?? name}</h2>
          <p className="text-muted">@{p?.ig_handle}</p>
          <div className="mt-1">
            <Stars value={Number(p?.avg_stars ?? 0)} count={p?.review_count ?? 0} />
          </div>
        </div>
        <Badge>{role === "brand" ? "Brand" : "Creator"}</Badge>
      </div>

      <Card className="p-5">
        {creator && (
          <>
            <dl className="grid grid-cols-3 gap-4">
              <Detail label="Followers">{compactFollowers(creator.followers!)}</Detail>
              <Detail label="Niche">{creator.niche}</Detail>
              <Detail label="City">{creator.city}</Detail>
            </dl>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Your rates</p>
              <RatesTable rates={creator.rates} other={creator.other_content} />
            </div>
          </>
        )}
        {brand && (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Detail label="Contact">{name}</Detail>
            <Detail label="Industry">{brand.industry}</Detail>
            <Detail label="Location">{brand.location}</Detail>
            <Detail label="Audience">
              {brand.audience_age_min}–{brand.audience_age_max} yrs
            </Detail>
          </dl>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-bold">Private details</h3>
          <Badge tone="gray">Only you can see this</Badge>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Phone">{priv?.phone ? `+${priv.phone}` : "—"}</Detail>
          <Detail label="Email">{priv?.email ?? "—"}</Detail>
        </dl>
      </Card>

      {creator && (
        <section>
          <h3 className="mb-3 text-lg font-bold">Portfolio</h3>
          <PortfolioGrid items={creator.portfolio ?? []} />
        </section>
      )}

      <section>
        <h3 className="mb-3 text-lg font-bold">Reviews about you</h3>
        <ReviewList supabase={supabase} userId={id} />
      </section>

      <SignOutButton />
    </div>
  );
}
