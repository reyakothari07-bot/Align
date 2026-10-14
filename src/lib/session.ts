import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/constants";

/** The signed-in user and their app profile (cached per request). */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  // Verified locally against the project's JWT signing key; no auth API round trip.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { supabase, user: null, profile: null } as const;
  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
  const { data: profile } = await supabase
    .from("users")
    .select("id, role, name, suspended")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile } as const;
});

/** For pages inside the app: must be signed in and onboarded. */
export async function requireViewer() {
  const { supabase, user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile?.role) redirect("/onboarding");
  return {
    supabase,
    id: user.id,
    role: profile.role as Role,
    name: profile.name,
    suspended: profile.suspended,
  };
}

export async function requireRole(role: Role) {
  const viewer = await requireViewer();
  if (viewer.role !== role) redirect("/home");
  return viewer;
}
