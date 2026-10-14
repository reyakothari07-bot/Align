import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { Card, Stars } from "@/components/ui";
import { timeAgo } from "@/lib/format";

/** Reviews about a user, with each reviewer's public display name. */
export async function ReviewList({ supabase, userId }: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, stars, text, created_at, reviewer_id")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (!reviews?.length) return <p className="text-sm text-muted">No reviews yet.</p>;

  const ids = reviews.map((r) => r.reviewer_id);
  const [{ data: brands }, { data: users }] = await Promise.all([
    supabase.from("brand_profiles").select("user_id, brand_name").in("user_id", ids),
    supabase.from("users").select("id, name").in("id", ids),
  ]);
  const nameOf = (id: string) => brands?.find((b) => b.user_id === id)?.brand_name ?? users?.find((u) => u.id === id)?.name ?? "Align user";

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{nameOf(r.reviewer_id)}</p>
            <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
          </div>
          <div className="mt-1">
            <Stars value={r.stars} />
          </div>
          {r.text && <p className="mt-2 text-sm">{r.text}</p>}
        </Card>
      ))}
    </div>
  );
}
