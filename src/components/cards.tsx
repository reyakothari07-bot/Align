import Link from "next/link";
import type { Database } from "@/lib/database.types";
import { Avatar, Badge, Card, Stars } from "@/components/ui";
import { PortfolioTile } from "@/components/portfolio";
import { COMP_TYPES, categoryLabel, contentLabel, nicheLabels, ratesList } from "@/lib/constants";
import { compactFollowers, daysUntil, formatDate } from "@/lib/format";

type CampaignCardRow = Database["public"]["Views"]["campaign_cards"]["Row"];
type CreatorCardRow = Database["public"]["Views"]["creator_cards"]["Row"];

export function compLabel(c: string | null) {
  return COMP_TYPES.find((x) => x.value === c)?.label ?? c ?? "";
}

export function deadlineLabel(date: string) {
  const d = daysUntil(date);
  if (d < 0) return `Ended ${formatDate(date)}`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d <= 14) return `${d} days left`;
  return `By ${formatDate(date)}`;
}

export function CampaignCard({ c, applied }: { c: CampaignCardRow; applied?: boolean }) {
  const slotsLeft = (c.slots ?? 0) - (c.slots_filled ?? 0);
  return (
    <Link href={`/campaigns/${c.id}`} className="block">
      <Card className="h-full p-5 transition hover:shadow-lg hover:shadow-brand-600/5 hover:ring-brand-200">
        <div className="flex items-center gap-3">
          <Avatar name={c.brand_name ?? ""} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{c.brand_name}</p>
            <p className="truncate text-xs text-muted">
              {categoryLabel(c.industry, c.industry_other)} · {c.location}
            </p>
          </div>
          {applied ? (
            <Badge tone="green">Applied</Badge>
          ) : c.brand_open_payment_reports ? (
            <Badge tone="amber">⚠️ Payment report</Badge>
          ) : (
            <Stars value={Number(c.brand_avg_stars)} />
          )}
        </div>
        <h3 className="mt-4 text-lg font-bold leading-snug">{c.title}</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge>{contentLabel(c.content_type, c.content_other)}</Badge>
          <Badge tone={c.comp_type === "barter" ? "amber" : "green"}>{c.budget_bucket}</Badge>
          {c.comp_type === "both" && <Badge tone="blue">+ product</Badge>}
          <Badge tone="gray">{categoryLabel(c.niche, c.niche_other)}</Badge>
        </div>
        <div className="mt-4 flex justify-between border-t border-line pt-3 text-xs font-medium text-muted">
          <span>{deadlineLabel(c.deadline!)}</span>
          <span>
            {c.status === "closed" ? "Closed" : `${slotsLeft} of ${c.slots} slot${c.slots === 1 ? "" : "s"} left`}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function CreatorCard({ c }: { c: CreatorCardRow }) {
  return (
    <Link href={`/creators/${c.user_id}`} className="block">
      <Card className="h-full overflow-hidden transition hover:shadow-lg hover:shadow-brand-600/5 hover:ring-brand-200">
        <div className="grid grid-cols-3 gap-0.5 bg-line">
          {(c.portfolio ?? []).slice(0, 3).map((url, i) => (
            <div key={i} className="[&>*]:rounded-none [&>*]:ring-0">
              <PortfolioTile url={url} preview />
            </div>
          ))}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold">{c.name}</p>
              <p className="truncate text-sm text-muted">@{c.ig_handle}</p>
            </div>
            <Stars value={Number(c.avg_stars)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>{compactFollowers(c.followers ?? 0)} followers</Badge>
            {nicheLabels(c.niches, c.niche_other, c.niche)
              .slice(0, 2)
              .map((n) => (
                <Badge key={n} tone="gray">
                  {n}
                </Badge>
              ))}
            <Badge tone="gray">{c.city}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ratesList(c.rates, c.other_content)
              .slice(0, 3)
              .map((r) => (
                <Badge key={r.type} tone={r.bucket === "Barter" ? "amber" : "green"}>
                  {r.label} · {r.bucket}
                </Badge>
              ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
