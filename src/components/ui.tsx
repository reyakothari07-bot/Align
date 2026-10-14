import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { initials } from "@/lib/format";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-600/20",
  secondary: "bg-white text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const sizes = {
  lg: "h-14 px-6 text-base w-full",
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-3.5 text-sm rounded-xl",
};

export function Button({
  variant = "primary",
  size = "lg",
  className,
  loading,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes; loading?: boolean }) {
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "lg",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-3xl bg-white ring-1 ring-line", className)} {...props} />;
}

export function Badge({ tone = "brand", children }: { tone?: "brand" | "green" | "amber" | "red" | "gray" | "blue"; children: ReactNode }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    gray: "bg-gray-50 text-gray-600 ring-gray-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-16 text-lg" }[size];
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white", s)}>
      {initials(name)}
    </span>
  );
}

export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const rounded = Math.round(value);
  return (
    <span className={cx("inline-flex items-center gap-1", size === "md" ? "text-base" : "text-sm")}>
      <span className="tracking-tight text-amber-400" aria-hidden>
        {"★★★★★".slice(0, rounded)}
        <span className="text-gray-200">{"★★★★★".slice(rounded)}</span>
      </span>
      <span className="font-semibold text-ink">{value ? Number(value).toFixed(1) : "New"}</span>
      {count != null && count > 0 && <span className="text-muted">({count})</span>}
      <span className="sr-only">{value ? `${value} out of 5 stars` : "No ratings yet"}</span>
    </span>
  );
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {back && (
        <Link href={back} className="-ml-2 mt-0.5 rounded-full p-2 text-muted hover:bg-brand-50" aria-label="Back">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <Card className="px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-2xl">✨</div>
      <p className="font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mx-auto mt-6 max-w-xs">{action}</div>}
    </Card>
  );
}

export function Alert({ tone = "red", children }: { tone?: "red" | "amber" | "brand" | "green"; children: ReactNode }) {
  const tones = {
    red: "bg-red-50 text-red-700 ring-red-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    brand: "bg-brand-50 text-brand-800 ring-brand-100",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  };
  return (
    <div role="alert" className={cx("rounded-2xl px-4 py-3 text-sm ring-1 ring-inset", tones[tone])}>
      {children}
    </div>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold">{children}</dd>
    </div>
  );
}
