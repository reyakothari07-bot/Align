"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { errorMessage } from "@/lib/format";

export function CampaignStatusToggle({ id, status }: { id: string; status: "open" | "closed" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (status === "open" && !confirm("Close this campaign? Creators won't be able to apply.")) return;
    setLoading(true);
    const { error } = await createClient()
      .from("campaigns")
      .update({ status: status === "open" ? "closed" : "open" })
      .eq("id", id);
    setLoading(false);
    if (error) return alert(errorMessage(error));
    router.refresh();
  }

  return (
    <Button size="sm" variant={status === "open" ? "danger" : "secondary"} loading={loading} onClick={toggle}>
      {status === "open" ? "Close" : "Reopen"}
    </Button>
  );
}
