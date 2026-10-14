export function inr(amount: number | null | undefined) {
  if (amount == null) return "Barter";
  return "₹" + amount.toLocaleString("en-IN");
}

export function compactFollowers(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K";
  return String(n);
}

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(d);
}

export function daysUntil(date: string) {
  const target = new Date(date + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** Supabase/PostgREST errors carry the friendly message raised by our SQL functions. */
export function errorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export type PortfolioKind = "image" | "video" | "link";

export function portfolioKind(url: string): PortfolioKind {
  if (/\.(mp4|mov|webm)(\?|$)/i.test(url)) return "video";
  if (/\.(jpe?g|png|webp|gif|heic|avif)(\?|$)/i.test(url)) return "image";
  return "link";
}

/** "1 creator", "3 creators". */
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
