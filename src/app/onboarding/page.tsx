import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const { supabase, user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (profile?.role) redirect("/home");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) redirect("/admin");

  return (
    <OnboardingWizard
      userId={user.id}
      defaultName={profile?.name ?? ""}
      defaultEmail={user.email ?? ""}
    />
  );
}
