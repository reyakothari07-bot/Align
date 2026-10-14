"use client";

import { Field, Input } from "@/components/form";

/** 10-digit Indian mobile number with a fixed +91 prefix. */
export function MobileInput({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label="Mobile number" hint={hint ?? "Private. Never shown to brands or creators."}>
      <div className="flex gap-2">
        <span className="flex h-12 items-center rounded-2xl bg-white px-4 font-semibold ring-1 ring-inset ring-line">+91</span>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={value}
          maxLength={14}
          onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, ""))}
        />
      </div>
    </Field>
  );
}

/** Returns the 10 digits if it's a valid Indian mobile number, else null. */
export function cleanMobile(v: string) {
  const d = v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
