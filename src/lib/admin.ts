import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";

/** For /admin pages: signed in and is_admin (checked by the database). */
export async function requireAdmin() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/home");
  return { supabase, id: user.id };
}

export type AdminOverview = {
  creators: number;
  brands: number;
  open_campaigns: number;
  pending_requests: number;
  deals: Partial<Record<"in_progress" | "posted" | "payment_received" | "completed" | "disputed", number>>;
  open_payment_reports: number;
  open_content_disputes: number;
  overdue_payments: number;
  suspended_users: number;
  unchecked_creators: number;
  paid_value_completed: number;
};

export type AdminDispute = {
  id: string;
  status: string;
  dispute_type: "payment" | "content" | null;
  dispute_reason: string | null;
  disputed_at: string;
  amount: number | null;
  comp_type: string;
  post_url: string | null;
  posted_at: string | null;
  payment_overdue_at: string | null;
  deliverable: string;
  deadline: string;
  brand_agreed_at: string | null;
  brand_terms_version: string | null;
  brand_name: string;
  brand_contact: string;
  brand_phone: string | null;
  brand_email: string | null;
  creator_name: string;
  creator_ig: string;
  creator_phone: string | null;
  creator_email: string | null;
  raised_by_creator: boolean | null;
};

export type AdminUser = {
  id: string;
  role: "creator" | "brand";
  name: string;
  violation_count: number;
  suspended: boolean;
  created_at: string;
  phone: string | null;
  email: string | null;
  brand_name: string | null;
  ig_handle: string | null;
  followers: number | null;
  niche: string | null;
  city: string | null;
  followers_checked_at: string | null;
  deals: number;
};
