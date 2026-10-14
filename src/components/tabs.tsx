import Link from "next/link";
import { cx } from "@/components/ui";

export function Tabs({ tabs, active, base }: { tabs: { key: string; label: string; count?: number }[]; active: string; base: string }) {
  return (
    <div className="mb-5 flex gap-1 rounded-2xl bg-brand-50 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${base}?tab=${t.key}`}
          className={cx(
            "flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition",
            active === t.key ? "bg-white text-brand-700 shadow-sm" : "text-muted",
          )}
        >
          {t.label}
          {!!t.count && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] text-white">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
