import Link from "next/link";
import { requireAdmin, type AdminUser } from "@/lib/admin";
import { Badge, Card, EmptyState, cx } from "@/components/ui";
import { compactFollowers, formatDate } from "@/lib/format";
import { UserActions } from "./user-actions";
import { UserSearch } from "./user-search";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "creators", label: "Creators" },
  { value: "brands", label: "Brands" },
  { value: "warned", label: "Warned" },
  { value: "suspended", label: "Suspended" },
  { value: "unchecked", label: "Follower checks" },
];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const filter = typeof sp.filter === "string" ? sp.filter : "all";
  const q = typeof sp.q === "string" ? sp.q : "";
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_users", { p_search: q, p_filter: filter });
  const users = (data ?? []) as unknown as AdminUser[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{filter === "unchecked" ? "Follower checks" : "Users"}</h1>
        <p className="mt-1 text-sm text-muted">
          {filter === "unchecked"
            ? "Follower counts are self-reported. Open each Instagram profile, compare, then mark it checked (or suspend fakes)."
            : "Search creators and brands, see warnings, and suspend or restore accounts."}
        </p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <UserSearch initial={q} />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/users?filter=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cx(
                "rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset",
                filter === f.value ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-line",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users here" body="Try another filter or search." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{u.brand_name ?? u.name}</p>
                  <p className="truncate text-sm text-muted">
                    {u.brand_name ? `${u.name} · ` : ""}
                    {u.ig_handle && (
                      <a href={`https://instagram.com/${u.ig_handle}`} target="_blank" rel="noopener noreferrer" className="text-brand-700">
                        @{u.ig_handle}
                      </a>
                    )}
                    {u.followers != null && ` · ${compactFollowers(u.followers)} followers`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={u.role === "brand" ? "blue" : "brand"}>{u.role === "brand" ? "Brand" : "Creator"}</Badge>
                  {u.suspended && <Badge tone="red">Suspended</Badge>}
                  {!u.suspended && u.violation_count > 0 && <Badge tone="amber">{u.violation_count}/3 warnings</Badge>}
                  {u.role === "creator" && u.followers_checked_at && <Badge tone="green">Followers checked</Badge>}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted">
                {u.phone ? `+${u.phone}` : "—"} · {u.email ?? "no email"} · {u.deals} deal{u.deals === 1 ? "" : "s"} · joined {formatDate(u.created_at)}
              </p>
              <UserActions id={u.id} suspended={u.suspended} canCheck={u.role === "creator" && !u.followers_checked_at} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
