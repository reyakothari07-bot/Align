"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cx } from "@/components/ui";

export function AdminNav({ counts }: { counts: { disputes: number; suspended: number; unchecked: number } }) {
  const pathname = usePathname();
  const filter = useSearchParams().get("filter");
  const items = [
    { href: "/admin", label: "Overview", on: pathname === "/admin" },
    { href: "/admin/disputes", label: "Disputes", count: counts.disputes, on: pathname.startsWith("/admin/disputes") },
    { href: "/admin/users", label: "Users", on: pathname.startsWith("/admin/users") && filter !== "unchecked" },
    { href: "/admin/users?filter=unchecked", label: "Follower checks", count: counts.unchecked, on: pathname.startsWith("/admin/users") && filter === "unchecked" },
  ];
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 no-scrollbar">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cx(
            "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
            i.on ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink",
          )}
        >
          {i.label}
          {!!i.count && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] leading-none text-white">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
