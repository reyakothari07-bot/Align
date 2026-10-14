"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { errorMessage } from "@/lib/format";

export function AcceptTermsForm({ version }: { version: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    const { error } = await createClient().rpc("accept_brand_terms", { p_version: version });
    if (error) {
      setLoading(false);
      return setError(errorMessage(error));
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      {error && <Alert>{error}</Alert>}
      <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-inset ring-line">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand-600" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span className="text-sm font-medium">I have read and agree to the Align Brand Terms, including paying creators the agreed amount on time.</span>
      </label>
      <Button disabled={!agreed} loading={loading} onClick={accept}>
        Accept and continue
      </Button>
    </div>
  );
}
