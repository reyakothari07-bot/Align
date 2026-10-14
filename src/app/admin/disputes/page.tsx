import { requireAdmin, type AdminDispute } from "@/lib/admin";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate, inr, timeAgo } from "@/lib/format";
import { ResolveDispute } from "./resolve";

type Msg = { sender: string; body: string; at: string };

function Contact({ label, name, phone, email }: { label: string; name: string; phone: string | null; email: string | null }) {
  return (
    <div className="min-w-0 rounded-2xl bg-canvas p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate font-semibold">{name}</p>
      {phone && (
        <a href={`tel:+${phone}`} className="block truncate text-sm text-brand-700">
          +{phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="block truncate text-sm text-brand-700">
          {email}
        </a>
      )}
    </div>
  );
}

export default async function AdminDisputesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_disputes");
  const disputes = (data ?? []) as unknown as AdminDispute[];
  const chats = await Promise.all(
    disputes.map(async (d) => ((await supabase.rpc("admin_deal_messages", { p_deal_id: d.id })).data ?? []) as unknown as Msg[]),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
        <p className="mt-1 text-sm text-muted">Non-payment reports from creators and content disputes from brands. Both sides are notified of your decision.</p>
      </div>

      {disputes.length === 0 ? (
        <EmptyState title="No open disputes" body="Everything is running smoothly." />
      ) : (
        disputes.map((d, i) => {
          const payment = d.dispute_type === "payment";
          return (
            <Card key={d.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                <Badge tone={payment ? "red" : "amber"}>{payment ? "Non-payment report" : "Content dispute"}</Badge>
                <span className="text-sm text-muted">
                  raised by {d.raised_by_creator ? d.creator_name : d.brand_name} · {timeAgo(d.disputed_at)}
                </span>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold">{d.deliverable}</h2>
                    <p className="text-sm text-muted">
                      {inr(d.amount)} · {d.comp_type} · due {formatDate(d.deadline)}
                      {d.posted_at && ` · posted ${formatDate(d.posted_at)}`}
                    </p>
                  </div>
                  {d.dispute_reason && (
                    <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">&ldquo;{d.dispute_reason}&rdquo;</p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Contact label="Brand" name={`${d.brand_name} (${d.brand_contact})`} phone={d.brand_phone} email={d.brand_email} />
                    <Contact label="Creator" name={`${d.creator_name} (@${d.creator_ig})`} phone={d.creator_phone} email={d.creator_email} />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {d.post_url && (
                      <li>
                        Post:{" "}
                        <a href={d.post_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
                          {d.post_url}
                        </a>
                      </li>
                    )}
                    <li>
                      Brand&apos;s promise to pay:{" "}
                      <span className="font-semibold">
                        {d.brand_agreed_at ? `agreed ${formatDate(d.brand_agreed_at)} (terms v${d.brand_terms_version})` : "not recorded (older deal)"}
                      </span>
                    </li>
                    {d.payment_overdue_at && (
                      <li className="font-semibold text-red-600">Payment flagged overdue on {formatDate(d.payment_overdue_at)}</li>
                    )}
                  </ul>
                  <ResolveDispute dealId={d.id} payment={payment} />
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Deal chat ({chats[i].length})</p>
                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-canvas p-3">
                    {chats[i].length === 0 && <p className="text-sm text-muted">No messages.</p>}
                    {chats[i].map((m, k) => (
                      <div key={k} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line">
                        <p className="text-xs font-semibold text-muted">
                          {m.sender} · {timeAgo(m.at)}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
