"use client";

/** The brand's explicit promise to pay, required for every action that commits to a price. */
export function AgreeToPay({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-brand-50/70 p-4 ring-1 ring-inset ring-brand-100">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm font-medium">
        {text}{" "}
        <a href="/terms/brands" target="_blank" className="font-semibold text-brand-700 underline">
          Read terms
        </a>
      </span>
    </label>
  );
}
