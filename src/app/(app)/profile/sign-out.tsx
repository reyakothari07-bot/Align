"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function SignOutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      size={compact ? "sm" : "lg"}
      className={compact ? "w-full" : undefined}
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
