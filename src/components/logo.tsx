export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="10" className={light ? "fill-white" : "fill-brand-600"} />
        <path
          d="M9 21.5L14.2 10h3.6L23 21.5M11.6 17h8.8"
          fill="none"
          className={light ? "stroke-brand-700" : "stroke-white"}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>align</span>
    </span>
  );
}
