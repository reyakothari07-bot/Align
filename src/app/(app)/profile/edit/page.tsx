import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { EditProfileForm } from "./edit-form";

export default async function EditProfilePage() {
  const { supabase, id, role, name } = await requireViewer();
  const [{ data: priv }, { data: creator }, { data: brand }] = await Promise.all([
    supabase.from("user_private").select("email").eq("user_id", id).maybeSingle(),
    supabase.from("creator_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("brand_profiles").select("*").eq("user_id", id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit profile" back="/profile" />
      <EditProfileForm userId={id} role={role} name={name} email={priv?.email ?? ""} creator={creator} brand={brand} />
    </div>
  );
}
