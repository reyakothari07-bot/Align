"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { errorMessage } from "@/lib/format";

export function UserActions({ id, suspended, canCheck }: { id: string; suspended: boolean; canCheck: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(key: string, fn: () => PromiseLike<{ error: unknown }>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setLoading(key);
    const { error } = await fn();
    setLoading(null);
    if (error) return alert(errorMessage(error));
    router.refresh();
  }

  const supabase = () => createClient();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canCheck && (
        <Button size="sm" variant="secondary" loading={loading === "check"} onClick={() => run("check", () => supabase().rpc("admin_mark_followers_checked", { p_user_id: id }))}>
          Mark followers checked
        </Button>
      )}
      {suspended ? (
        <Button size="sm" loading={loading === "suspend"} onClick={() => run("suspend", () => supabase().rpc("admin_set_suspended", { p_user_id: id, p_suspended: false }))}>
          Lift suspension
        </Button>
      ) : (
        <Button
          size="sm"
          variant="danger"
          loading={loading === "suspend"}
          onClick={() => run("suspend", () => supabase().rpc("admin_set_suspended", { p_user_id: id, p_suspended: true }), "Suspend this account?")}
        >
          Suspend
        </Button>
      )}
    </div>
  );
}
