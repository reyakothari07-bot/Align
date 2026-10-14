import type { Database } from "@/lib/database.types";

export type ContentType = Database["public"]["Enums"]["content_type"];
export type CompType = Database["public"]["Enums"]["comp_type"];
export type BudgetBucket = Database["public"]["Enums"]["budget_bucket"];
export type DealStatus = Database["public"]["Enums"]["deal_status"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type Role = Database["public"]["Enums"]["user_role"];

// Shared list: creators pick a niche, brands pick an industry, campaigns pick the niche they want.
export const NICHES = [
  "Fashion",
  "Beauty",
  "Food",
  "Travel",
  "Fitness",
  "Lifestyle",
  "Tech",
  "Gaming",
  "Home & Decor",
  "Parenting",
  "Education",
  "Finance",
  "Comedy",
  "Pets",
  "Other",
] as const;

export const CITIES = [
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Chandigarh",
  "Lucknow",
  "Kochi",
  "Goa",
  "Indore",
  "Other",
] as const;

// Brands can also be online-only / nationwide.
export const BRAND_LOCATIONS = [...CITIES.slice(0, -1), "Pan-India", "Other"] as const;

export const CONTENT_TYPES: ContentType[] = ["UGC", "Reel", "Post", "Story", "Other"];

export const BUDGET_BUCKETS: BudgetBucket[] = [
  "Barter",
  "₹1K–2K",
  "₹2K–3K",
  "₹3K–4K",
  "₹4K–5K",
  "₹5K–6K",
  "₹6K–7K",
  "₹7K–8K",
  "₹8K–9K",
  "₹9K–10K",
  "₹10K–11K",
  "₹11K–12K",
  "₹12K+",
];

export const COMP_TYPES: { value: CompType; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "barter", label: "Barter" },
  { value: "both", label: "Paid + product" },
];

export const FOLLOWER_RANGES = [
  { value: "1000-2500", label: "1K–2.5K", min: 1000, max: 2500 },
  { value: "2500-5000", label: "2.5K–5K", min: 2500, max: 5000 },
  { value: "5000-7500", label: "5K–7.5K", min: 5000, max: 7500 },
  { value: "7500-10000", label: "7.5K–10K", min: 7500, max: 10000 },
  { value: "10000-12000", label: "10K–12K", min: 10000, max: 12000 },
] as const;

export const CREATOR_MIN_FOLLOWERS = 1000;
export const CREATOR_MAX_FOLLOWERS = 12000;
export const MIN_AGE = 18;

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  in_progress: "In progress",
  posted: "Posted",
  payment_received: "Payment received",
  completed: "Completed",
  disputed: "Disputed",
};

export const STATUS_TONE: Record<DealStatus, "brand" | "blue" | "green" | "amber" | "red"> = {
  in_progress: "brand",
  posted: "blue",
  payment_received: "amber",
  completed: "green",
  disputed: "red",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  requested: "Waiting for reply",
  countered: "Counter-offer",
  accepted: "Accepted",
  declined: "Declined",
};

export const POLITE = {
  underAge: "Align is only for people aged 18 and over. Thanks for your interest, and we'd love to see you when you turn 18!",
  followers:
    "Align is built for creators with 1K–12K followers right now. Thanks for your interest, and do check back if that changes!",
  contactInfo: "Sharing contact details isn't allowed on Align.",
};

/** A creator's rate for each content type they make, e.g. { Reel: "₹3K–4K", Story: "₹1K–2K" }. */
export type Rates = Partial<Record<ContentType, BudgetBucket>>;

export const OTHER_MAX = 40;

/** "Other" shows what was typed for it (e.g. "Podcast clip"); everything else shows as-is. */
export function contentLabel(type: ContentType | null | undefined, other?: string | null) {
  if (type === "Other" && other?.trim()) return other.trim();
  return type ?? "";
}

/** Rates in a stable order (UGC, Reel, Post, Story, Other) with display labels. */
export function ratesList(rates: unknown, other?: string | null) {
  const r = (rates && typeof rates === "object" ? rates : {}) as Rates;
  return CONTENT_TYPES.filter((t) => r[t]).map((t) => ({ type: t, label: contentLabel(t, other), bucket: r[t]! }));
}

export const MAX_NICHES = 3;

/** "Other" shows the typed text; anything else shows as-is. Works for niches and industries. */
export function categoryLabel(value: string | null | undefined, other?: string | null) {
  if (value === "Other" && other?.trim()) return other.trim();
  return value ?? "";
}

/** A creator's niches as display labels, main niche first. */
export function nicheLabels(niches: string[] | null | undefined, other?: string | null, fallback?: string | null) {
  const list = niches?.length ? niches : fallback ? [fallback] : [];
  return list.map((n) => categoryLabel(n, other));
}
