import Link from "next/link";
import { requireAdmin, type AdminOverview } from "@/lib/admin";
import { Card } from "@/components/ui";
import { inr } from "@/lib/format";

function Stat({ label, value, href, tone = "ink" }: { label: string; value: string | number; href?: string; tone?: "ink" | "red" | "amber" }) {
  const color = { ink: "text-ink", red: "text-red-600", amber: "text-amber-600" }[tone];
  const body = (
    <Card className="h-full p-5 transition hover:ring-brand-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_overview");
  const o = data as unknown as AdminOverview;
  const d = o.deals ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted">What needs attention on Align right now.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Needs action</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Non-payment reports" value={o.open_payment_reports} href="/admin/disputes" tone={o.open_payment_reports ? "red" : "ink"} />
          <Stat label="Content disputes" value={o.open_content_disputes} href="/admin/disputes" tone={o.open_content_disputes ? "amber" : "ink"} />
          <Stat label="Overdue payments" value={o.overdue_payments} tone={o.overdue_payments ? "amber" : "ink"} />
          <Stat label="Suspended accounts" value={o.suspended_users} href="/admin/users?filter=suspended" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Marketplace</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Creators" value={o.creators} href="/admin/users?filter=creators" />
          <Stat label="Brands" value={o.brands} href="/admin/users?filter=brands" />
          <Stat label="Open campaigns" value={o.open_campaigns} />
          <Stat label="Pending requests" value={o.pending_requests} />
          <Stat label="Deals in progress" value={(d.in_progress ?? 0) + (d.posted ?? 0) + (d.payment_received ?? 0)} />
          <Stat label="Completed deals" value={d.completed ?? 0} />
          <Stat label="Value of completed deals" value={inr(o.paid_value_completed)} />
          <Stat label="Follower checks to do" value={o.unchecked_creators} href="/admin/users?filter=unchecked" />
        </div>
      </section>
    </div>
  );
}
