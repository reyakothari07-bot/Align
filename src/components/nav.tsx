"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/constants";
import { cx } from "@/components/ui";

type Item = { href: string; label: string; icon: keyof typeof icons; match: string[] };

const icons = {
  home: "M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z",
  megaphone: "M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zm13-3a5 5 0 010 8m2.5-10.5a8.5 8.5 0 010 13",
  inbox: "M4 13h4l1.5 3h5L16 13h4M4 13l2.5-7h11l2.5 7v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z",
  handshake: "M8 12l3 3 5-5M12 21a9 9 0 100-18 9 9 0 000 18z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0",
};

function itemsFor(role: Role): Item[] {
  return [
    { href: "/home", label: role === "brand" ? "Creators" : "Campaigns", icon: "home", match: ["/home", "/creators", "/campaigns/"] },
    ...(role === "brand"
      ? [{ href: "/campaigns/mine", label: "My campaigns", icon: "megaphone" as const, match: ["/campaigns/mine", "/campaigns/new"] }]
      : []),
    { href: "/requests", label: "Requests", icon: "inbox", match: ["/requests"] },
    { href: "/deals", label: "Deals", icon: "handshake", match: ["/deals"] },
    { href: "/profile", label: "Profile", icon: "user", match: ["/profile", "/brands"] },
  ];
}

function useActive() {
  const pathname = usePathname();
  return (item: Item) =>
    item.match.some((m) => pathname === m || pathname.startsWith(m)) &&
    // "/campaigns/" belongs to Home except for the brand's own campaign pages
    !(item.href === "/home" && (pathname.startsWith("/campaigns/mine") || pathname.startsWith("/campaigns/new")));
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function DesktopNav({ role }: { role: Role }) {
  const isActive = useActive();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {itemsFor(role).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cx(
            "rounded-xl px-3.5 py-2 text-sm font-semibold transition",
            isActive(item) ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ role }: { role: Role }) {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {itemsFor(role).map((item) => {
          const on = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", on ? "text-brand-700" : "text-muted")}
            >
              <Icon d={icons[item.icon]} className={cx("size-6", on && "stroke-[2.3]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
