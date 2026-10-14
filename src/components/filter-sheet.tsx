"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { Chips, Field, Select } from "@/components/form";
import { BRAND_LOCATIONS, BUDGET_BUCKETS, CITIES, CONTENT_TYPES, FOLLOWER_RANGES, NICHES, type Role } from "@/lib/constants";

const KEYS = ["location", "category", "followers", "type", "budget"] as const;
type Filters = Partial<Record<(typeof KEYS)[number], string>>;

/** Filters live in the URL so the server renders the filtered feed. */
export function FilterSheet({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current: Filters = Object.fromEntries(KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)!]));
  const activeCount = Object.keys(current).length;

  const [open, setOpen] = useState(params.get("open") === "filters");
  const [draft, setDraft] = useState<Filters>(current);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function apply(next: Filters) {
    const qs = new URLSearchParams();
    for (const k of KEYS) if (next[k]) qs.set(k, next[k]!);
    router.push(qs.size ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  const set = (k: keyof Filters) => (v: string) => setDraft((d) => ({ ...d, [k]: d[k] === v ? undefined : v || undefined }));
  const browsingCreators = role === "brand";

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        onClick={() => {
          setDraft(current);
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filters{activeCount > 0 && ` · ${activeCount}`}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-canvas md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setDraft({})} className="text-sm font-semibold text-brand-700">
                Clear all
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <Field label="Location">
                <Select
                  value={draft.location ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value || undefined }))}
                  options={browsingCreators ? CITIES : BRAND_LOCATIONS}
                  placeholder="Anywhere"
                />
              </Field>
              <Field label={browsingCreators ? "Niche" : "Industry"}>
                <Chips options={NICHES} value={draft.category ?? null} onChange={(v) => set("category")(v as string)} />
              </Field>
              {browsingCreators && (
                <Field label="Followers">
                  <Chips
                    options={FOLLOWER_RANGES.map((r) => ({ value: r.value, label: r.label }))}
                    value={draft.followers ?? null}
                    onChange={(v) => set("followers")(v as string)}
                  />
                </Field>
              )}
              <Field label="Content type">
                <Chips options={CONTENT_TYPES} value={draft.type ?? null} onChange={(v) => set("type")(v as string)} />
              </Field>
              <Field label={browsingCreators ? "Creator's usual rate" : "Budget"}>
                <Select
                  value={draft.budget ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value || undefined }))}
                  options={BUDGET_BUCKETS}
                  placeholder="Any budget"
                />
              </Field>
            </div>
            <div className="border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button onClick={() => apply(draft)}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
