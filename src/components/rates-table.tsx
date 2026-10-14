import { ratesList } from "@/lib/constants";

/** Read-only list of a creator's rate per content type. */
export function RatesTable({ rates, other }: { rates: unknown; other?: string | null }) {
  const list = ratesList(rates, other);
  if (!list.length) return <p className="text-sm text-muted">No rates set.</p>;
  return (
    <dl className="divide-y divide-line">
      {list.map((r) => (
        <div key={r.type} className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-sm font-medium">{r.label}</dt>
          <dd className={`text-sm font-bold ${r.bucket === "Barter" ? "text-amber-700" : "text-emerald-700"}`}>{r.bucket}</dd>
        </div>
      ))}
    </dl>
  );
}
