import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { Logo } from "@/components/logo";
import { AdminNav } from "./admin-nav";
import { SignOutButton } from "@/app/(app)/profile/sign-out";

export const metadata = { title: "Align Admin" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_overview");
  const o = (data ?? {}) as { open_payment_reports?: number; open_content_disputes?: number; suspended_users?: number; unchecked_creators?: number };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-white">Admin</span>
          </Link>
          <div className="ml-auto w-28">
            <SignOutButton compact />
          </div>
        </div>
        <AdminNav
          counts={{
            disputes: (o.open_payment_reports ?? 0) + (o.open_content_disputes ?? 0),
            suspended: o.suspended_users ?? 0,
            unchecked: o.unchecked_creators ?? 0,
          }}
        />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
