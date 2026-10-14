import { Alert } from "@/components/ui";

/** Shown to creators when a brand has open non-payment reports. */
export function PaymentReportWarning({ count, brand }: { count: number | null | undefined; brand: string }) {
  if (!count) return null;
  return (
    <Alert tone="amber">
      ⚠️ {brand} has {count === 1 ? "an open report" : `${count} open reports`} of not paying a creator on time. The Align team is
      reviewing {count === 1 ? "it" : "them"}.
    </Alert>
  );
}
