import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Avatar, Card, PageHeader } from "@/components/ui";
import { RequestForm } from "./request-form";
import { compactFollowers } from "@/lib/format";
import type { Rates } from "@/lib/constants";

export default async function SendRequestPage({ params }: PageProps<"/creators/[id]/request">) {
  const { id } = await params;
  const { supabase } = await requireRole("brand");
  const { data: c } = await supabase.from("creator_cards").select("user_id, name, ig_handle, followers, content_types, other_content, rates").eq("user_id", id).maybeSingle();
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Send a request" back={`/creators/${id}`} />
      <Card className="mb-6 flex items-center gap-3 p-4">
        <Avatar name={c.name!} size="sm" />
        <div>
          <p className="font-semibold">{c.name}</p>
          <p className="text-sm text-muted">
            @{c.ig_handle} · {compactFollowers(c.followers!)} followers
          </p>
        </div>
      </Card>
      <RequestForm
        creatorId={id}
        creatorName={c.name!.split(" ")[0]}
        defaultType={c.content_types?.[0] ?? null}
        rates={(c.rates as Rates) ?? {}}
        creatorOther={c.other_content}
      />
    </div>
  );
}
