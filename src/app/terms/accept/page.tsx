import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { BRAND_TERMS_VERSION } from "@/lib/legal";
import { Logo } from "@/components/logo";
import { BrandTermsContent } from "@/components/terms-content";
import { AcceptTermsForm } from "./accept-form";

// Existing brands land here when they haven't accepted the current Brand Terms.
export default async function AcceptTermsPage() {
  const { supabase, user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (profile?.role !== "brand") redirect("/home");
  const { data: brand } = await supabase.from("brand_profiles").select("terms_version").eq("user_id", user.id).maybeSingle();
  if (brand?.terms_version === BRAND_TERMS_VERSION) redirect("/home");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold tracking-tight">{brand?.terms_version ? "Our Brand Terms have changed" : "Please review the Brand Terms"}</h1>
      <p className="mt-1 text-sm text-muted">To keep using Align, please read and accept the terms below. They include your promise to pay creators on time.</p>
      <div className="mt-6 max-h-[55dvh] overflow-y-auto rounded-3xl bg-white p-6 ring-1 ring-line">
        <BrandTermsContent />
      </div>
      <AcceptTermsForm version={BRAND_TERMS_VERSION} />
    </div>
  );
}
