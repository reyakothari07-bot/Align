"use client";

import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/components/ui";

const control =
  "w-full rounded-2xl border-0 bg-white px-4 text-base ring-1 ring-inset ring-line placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-gray-50 disabled:text-muted";

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "py-3", className)} {...props} />;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & { options: readonly (string | { value: string; label: string })[]; placeholder?: string }) {
  return (
    <select
      className={cx(
        control,
        "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b6480%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%236b6480%22 stroke-width=%221.8%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')] bg-[length:1.25rem] bg-[right_0.9rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

/** Tap-to-select chips. Single select when `multiple` is false. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  multiple,
}: {
  options: readonly (T | { value: T; label: string })[];
  value: T | T[] | null;
  onChange: (v: T | T[]) => void;
  multiple?: boolean;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        const on = selected.includes(opt.value);
        return (
          <button
            type="button"
            key={opt.value}
            aria-pressed={on}
            onClick={() => {
              if (multiple) onChange(on ? selected.filter((s) => s !== opt.value) : [...selected, opt.value]);
              else onChange(opt.value);
            }}
            className={cx(
              "min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition",
              on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink ring-line hover:ring-brand-300",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-semibold text-muted">
        <span>
          Step {step} of {total}
        </span>
        <span>{total - step === 0 ? "Last step" : `${total - step} to go`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}
