"use client";

import { Field, Input, Select } from "@/components/form";
import { BUDGET_BUCKETS, OTHER_MAX, contentLabel, type ContentType, type Rates } from "@/lib/constants";

/** Text box that appears when "Other" is picked as a content type. */
export function OtherContentInput({ value, onChange, label = "What kind of content?" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Field label={label} hint={`${value.length}/${OTHER_MAX} · e.g. Podcast clip, YouTube Short`}>
      <Input value={value} maxLength={OTHER_MAX} onChange={(e) => onChange(e.target.value)} placeholder="Describe the content" autoFocus />
    </Field>
  );
}

/** One rate per selected content type. */
export function RatesEditor({
  types,
  other,
  rates,
  onChange,
}: {
  types: ContentType[];
  other: string;
  rates: Rates;
  onChange: (r: Rates) => void;
}) {
  if (!types.length) return <p className="text-sm text-muted">Pick the content you make to set your rates.</p>;
  return (
    <div className="space-y-3">
      {types.map((t) => (
        <div key={t} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-3">
          <span className="truncate text-sm font-semibold">{contentLabel(t, other) || "Other"}</span>
          <Select
            aria-label={`Rate for ${contentLabel(t, other) || "Other"}`}
            value={rates[t] ?? ""}
            onChange={(e) => onChange({ ...rates, [t]: e.target.value || undefined })}
            options={BUDGET_BUCKETS}
            placeholder="Select"
          />
        </div>
      ))}
    </div>
  );
}

/** Keep only rates for the selected types (drops ones that were deselected). */
export function pickRates(rates: Rates, types: ContentType[]): Rates {
  return Object.fromEntries(types.filter((t) => rates[t]).map((t) => [t, rates[t]])) as Rates;
}
