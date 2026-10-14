import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { timeAgo } from "@/lib/format";

const ICON: Record<string, string> = {
  request_new: "📩",
  request_countered: "💬",
  request_accepted: "🤝",
  request_declined: "🙅",
  message: "💬",
  deal_status: "📦",
  reminder: "⏰",
  payment_overdue: "💸",
  rate: "⭐",
};

export default async function NotificationsPage() {
  const { supabase, id } = await requireViewer();
  const { data: items } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  // Opening the list marks everything as read (items above still render with their unread dot).
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", id).is("read_at", null);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" />
      {items?.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {items.map((n) => (
            <Link key={n.id} href={n.link ?? "/home"} className={cx("flex gap-3 px-4 py-4 hover:bg-brand-50/50", !n.read_at && "bg-brand-50/60")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg ring-1 ring-line">{ICON[n.type] ?? "🔔"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title="You're all caught up" body="Requests, replies, chat messages and deal updates will show up here." />
      )}
    </div>
  );
}
