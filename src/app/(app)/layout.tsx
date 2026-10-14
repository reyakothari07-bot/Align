import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { BRAND_TERMS_VERSION } from "@/lib/legal";
import { BottomNav, DesktopNav } from "@/components/nav";
import { NotificationBell } from "@/components/notification-bell";
import { Logo } from "@/components/logo";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, id, role, suspended } = await requireViewer();
  // Independent lookups run together rather than one after another.
  const [{ count }, terms] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", id).is("read_at", null),
    role === "brand" ? supabase.from("brand_profiles").select("terms_version").eq("user_id", id).maybeSingle() : null,
  ]);
  if (terms && terms.data?.terms_version !== BRAND_TERMS_VERSION) redirect("/terms/accept");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4">
          <Link href="/home" aria-label="Align home">
            <Logo />
          </Link>
          <DesktopNav role={role} />
          <div className="ml-auto">
            <NotificationBell userId={id} initialUnread={count ?? 0} />
          </div>
        </div>
      </header>
      {suspended && (
        <div className="bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white">
          Your account is suspended for repeatedly trying to share contact details. You can view your deals but can&apos;t send
          messages or requests. Contact Align support to appeal.
        </div>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-12">{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
