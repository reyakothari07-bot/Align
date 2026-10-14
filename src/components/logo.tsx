// Align logo: the ribbon "A" mark + "align" wordmark (Comfortaa), optional tagline.
// Recreated as a vector from the brand artwork so it stays sharp at every size.

const SHAPES = {
  ribbon:
    "M40 606 C110 490 200 345 272 262 C310 212 360 184 425 182 Q458 182 470 210 L666 590 Q672 612 650 607 Q612 600 588 578 L455 345 C425 285 375 250 330 250 C295 252 270 275 248 305 C190 385 120 495 64 608 Q52 614 40 606 Z",
  fold: "M455 345 L588 578 Q612 600 650 607 Q596 548 556 455 Q520 375 478 330 Z",
  blade: "M42 608 C112 500 232 420 382 402 C322 428 262 472 214 528 C182 566 154 596 132 612 Q86 620 42 608 Z",
};

const COLORS = {
  // deeper purple, for white/light backgrounds
  light: { r: ["#B79BFF", "#8B5CF6", "#5B21B6"], b: ["#C9B4FF", "#8B5CF6", "#6D28D9"], f: "#3B0F86" },
  // white-lavender, for purple backgrounds
  onpurple: { r: ["#FFFFFF", "#F1EAFF", "#D4C2FF"], b: ["#FFFFFF", "#EEE6FF", "#CDB9FF"], f: "#5B21B6" },
} as const;

export function LogoMark({ variant = "light", className }: { variant?: keyof typeof COLORS; className?: string }) {
  const c = COLORS[variant];
  const id = (k: string) => `align-${k}-${variant}`;
  return (
    <svg viewBox="30 172 650 450" className={className} aria-hidden>
      <defs>
        <linearGradient id={id("r")} gradientUnits="userSpaceOnUse" x1="330" y1="182" x2="560" y2="620">
          <stop offset="0" stopColor={c.r[0]} />
          <stop offset="0.5" stopColor={c.r[1]} />
          <stop offset="1" stopColor={c.r[2]} />
        </linearGradient>
        <linearGradient id={id("b")} gradientUnits="userSpaceOnUse" x1="380" y1="400" x2="60" y2="612">
          <stop offset="0" stopColor={c.b[0]} />
          <stop offset="0.55" stopColor={c.b[1]} />
          <stop offset="1" stopColor={c.b[2]} />
        </linearGradient>
        <linearGradient id={id("f")} gradientUnits="userSpaceOnUse" x1="470" y1="330" x2="640" y2="610">
          <stop offset="0" stopColor={c.f} stopOpacity="0" />
          <stop offset="1" stopColor={c.f} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id("r")})`} d={SHAPES.ribbon} />
      <path fill={`url(#${id("f")})`} d={SHAPES.fold} />
      <path fill={`url(#${id("b")})`} d={SHAPES.blade} />
    </svg>
  );
}

export const TAGLINE = "Creators grow further";

export function Logo({ light, size = "sm", tagline }: { light?: boolean; size?: "sm" | "lg"; tagline?: boolean }) {
  const lg = size === "lg";
  return (
    <span className={`inline-flex flex-col ${lg ? "items-center" : "items-start"}`}>
      <span className={`inline-flex items-center ${lg ? "flex-col gap-2" : "gap-2"}`}>
        <LogoMark variant={light ? "onpurple" : "light"} className={lg ? "h-20 w-auto" : "h-7 w-auto"} />
        <span
          className={`font-semibold leading-none ${lg ? "text-5xl" : "text-[22px]"} ${light ? "text-white" : "text-ink"}`}
          style={{ fontFamily: "Comfortaa, var(--font-sans)" }}
        >
          align
        </span>
      </span>
      {tagline && (
        <span className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.42em] ${light ? "text-brand-100" : "text-muted"}`}>
          {TAGLINE}
        </span>
      )}
    </span>
  );
}
